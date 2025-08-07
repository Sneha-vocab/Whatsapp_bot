const { pool } = require('../db');

// Retry function for database queries
async function retryQuery(queryFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      console.error(`Database query attempt ${i + 1} failed:`, error.message);
      
      // Don't retry for certain types of errors
      if (error.code === '42P01' || error.code === '42703') {
        // Table doesn't exist or column doesn't exist - don't retry
        throw error;
      }
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function getAllBrands() {
  try {
    // First try to get brands from the actual cars inventory with retry
    const res = await retryQuery(async () => {
      return await pool.query('SELECT DISTINCT make FROM cars WHERE make IS NOT NULL ORDER BY make');
    });
    
    if (res.rows.length > 0) {
      const brands = res.rows.map(row => row.make);
      // Limit to 10 brands for WhatsApp list compatibility
      return brands.slice(0, 10);
    }
  } catch (error) {
    console.error('Error fetching brands from cars table:', error);
  }
  
  try {
    // Fallback to car_brands_models table with retry
    const res = await retryQuery(async () => {
      return await pool.query('SELECT DISTINCT brand FROM car_brands_models ORDER BY brand');
    });
    
    const fallbackBrands = res.rows.map(row => row.brand);
    // Limit to 10 brands for WhatsApp list compatibility
    return fallbackBrands.slice(0, 10);
  } catch (error) {
    console.error('Error fetching brands from fallback table:', error);
    // Return default brands if both queries fail
    return ['Hyundai', 'Maruti', 'Honda', 'Tata', 'Mahindra'];
  }
}

async function getModelsByBrand(brand) {
  try {
    // First try to get models from the actual cars inventory with retry
    const res = await retryQuery(async () => {
      return await pool.query('SELECT DISTINCT model FROM cars WHERE make = $1 AND model IS NOT NULL ORDER BY model', [brand]);
    });
    
    if (res.rows.length > 0) {
      const models = res.rows.map(row => row.model);
      // Limit to 10 models for WhatsApp list compatibility
      return models.slice(0, 10);
    }
  } catch (error) {
    console.error('Error fetching models from cars table:', error);
  }
  
  try {
    // Fallback to car_brands_models table with retry
    // Handle brand name variations (e.g., "Maruti" vs "Maruti Suzuki")
    let fallbackBrand = brand;
    if (brand === 'Maruti') {
      fallbackBrand = 'Maruti Suzuki';
    }
    
    const res = await retryQuery(async () => {
      return await pool.query('SELECT model FROM car_brands_models WHERE brand = $1 ORDER BY model', [fallbackBrand]);
    });
    
    const models = res.rows.map(row => row.model);
    // Limit to 10 models for WhatsApp list compatibility
    return models.slice(0, 10);
  } catch (error) {
    console.error('Error fetching models from fallback table:', error);
    // Return default models if both queries fail
    return ['City', 'Swift', 'i20', 'Nexon', 'XUV'];
  }
}

function formatRupees(amount) {
  if (typeof amount === 'string') {
    // Convert string to number for formatting
    const numAmount = parseInt(amount);
    if (!isNaN(numAmount)) {
      return `₹${numAmount.toLocaleString('en-IN')}`;
    }
    return amount; // Return as-is if not a valid number
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

async function getAvailableTypes(budget) {
  try {
    // Get distinct car types from the cars table, filtered by budget
    let query = 'SELECT DISTINCT type FROM cars WHERE type IS NOT NULL AND ready_for_sales = true';
    let params = [];
    let paramCount = 0;
    
    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(estimated_selling_price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(estimated_selling_price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }
    
    query += ' ORDER BY type';
    
    console.log('🔍 Types query:', query);
    console.log('📊 Types params:', params);
    
    // Use retry mechanism for the query
    const res = await retryQuery(async () => {
      return await pool.query(query, params);
    });
    
    const types = res.rows.map(row => row.type);
    console.log(`📈 Found ${types.length} car types with available cars:`, types);
    return types;
  } catch (error) {
    console.error('Error fetching car types:', error);
    // Return default types if database query fails
    return [
      "Hatchback",
      "Sedan", 
      "SUV",
      "Compact SUV",
      "MUV"
    ];
  }
}

async function getAvailableBrands(budget, type) {
  try {
    // Build the same filter logic as getCarsByFilter to ensure consistency
    let query = 'SELECT DISTINCT make FROM cars WHERE make IS NOT NULL AND ready_for_sales = true';
    let params = [];
    let paramCount = 0;
    
    // Filter by type
    if (type && type !== 'Any' && type !== 'all') {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }
    
    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(estimated_selling_price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(estimated_selling_price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }
    
    query += ' ORDER BY make';
    
    console.log('🔍 Brands query:', query);
    console.log('📊 Brands params:', params);
    
    // Use retry mechanism for the main query
    const res = await retryQuery(async () => {
      return await pool.query(query, params);
    });
    
    const brands = res.rows.map(row => row.make);
    console.log(`📈 Found ${brands.length} brands with available cars:`, brands);
    // Limit to 10 brands for WhatsApp list compatibility
    return brands.slice(0, 10);
  } catch (error) {
    console.error('Error fetching brands:', error);
    // Fallback to car_brands_models table with retry
    try {
      const res = await retryQuery(async () => {
        return await pool.query('SELECT DISTINCT brand FROM car_brands_models ORDER BY brand');
      });
      const fallbackBrands = res.rows.map(row => row.brand);
      // Limit to 10 brands for WhatsApp list compatibility
      return fallbackBrands.slice(0, 10);
    } catch (fallbackError) {
      console.error('Error fetching brands from fallback table:', fallbackError);
      // Return default brands if both queries fail
      return ['Hyundai', 'Maruti', 'Honda', 'Tata', 'Mahindra'];
    }
  }
}

async function getCarsByFilter(budget, type, brand) {
  try {
    let query = 'SELECT * FROM cars WHERE ready_for_sales = true';
    let params = [];
    let paramCount = 0;

    // Filter by brand/make
    if (brand && brand !== 'Any' && brand !== 'all') {
      paramCount++;
      query += ` AND make = $${paramCount}`;
      params.push(brand);
    }

    // Filter by type
    if (type && type !== 'Any' && type !== 'all') {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(estimated_selling_price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(estimated_selling_price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }

    query += ' ORDER BY CAST(estimated_selling_price AS NUMERIC) ASC LIMIT 20';
    
    console.log('🔍 Query:', query);
    console.log('📊 Params:', params);
    
    // Use retry mechanism for the query
    const res = await retryQuery(async () => {
      return await pool.query(query, params);
    });
    
    console.log(`📈 Found ${res.rows.length} cars matching criteria`);
    return res.rows;
  } catch (error) {
    console.error('Error fetching cars by filter:', error);
    return [];
  }
}

module.exports = {
  getAllBrands,
  getModelsByBrand,
  formatRupees,
  getAvailableTypes,
  getAvailableBrands,
  getCarsByFilter
};
