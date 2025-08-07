const { pool } = require('../db');
const { formatRupees, getAvailableTypes, getAvailableBrands, getCarsByFilter } = require('./carData');
const { getNextAvailableDays, getTimeSlots } = require('./timeUtils');
const fs = require('fs');
const path = require('path');

async function handleBrowseUsedCars(session, userMessage) {
  console.log("📩 Entered handleBrowseUsedCars");
  const step = session.step || 'browse_start';
  console.log("🧠 Current step:", step);
  console.log("📝 User input:", userMessage);

  // Budget options constant
  const BUDGET_OPTIONS = [
    "Under ₹5 Lakhs",
    "₹5-10 Lakhs",
    "₹10-15 Lakhs",
    "₹15-20 Lakhs",
    "Above ₹20 Lakhs"
  ];

  switch (step) {
    case 'browse_start':
      console.log("🔄 Step matched: browse_start");
      
      // Check if user already selected a budget option
      if (BUDGET_OPTIONS.includes(userMessage)) {
        session.budget = userMessage;
        session.step = 'browse_type';
        const types = await getAvailableTypes(session.budget);
        return {
          message: `Perfect! ${userMessage} gives you excellent options. What type of car do you prefer?`,
          options: ['all Type', ...types]
        };
      }
      
      session.step = 'browse_budget';
      return {
        message: "Great choice! Let's find your perfect car. First, what's your budget range?",
        options: BUDGET_OPTIONS
      };

    case 'browse_budget':
      console.log("🔄 Step matched: browse_budget");
      session.budget = userMessage;
      session.step = 'browse_type';
      const types = await getAvailableTypes(session.budget);
      return {
        message: `Perfect! ${userMessage} gives you excellent options. What type of car do you prefer?`,
        options: ['all Type', ...types]
      };

    case 'browse_type':
      console.log("🔄 Step matched: browse_type");
      session.type = userMessage === 'all Type' ? 'all' : userMessage;
      session.step = 'browse_brand';
      const brands = await getAvailableBrands(session.budget, session.type);
      return {
        message: `Excellent choice! Which brand do you prefer?`,
        options: ['all Brand', ...brands]
      };

    case 'browse_brand':
      console.log("🔄 Step matched: browse_brand");
      session.brand = userMessage === 'all Brand' ? 'all' : userMessage;
      session.step = 'show_cars';
      const cars = await getCarsByFilter(session.budget, session.type, session.brand);
      session.filteredCars = cars;
      session.carIndex = 0;
      
      if (cars.length === 0) {
        return {
          message: `Sorry, no cars found matching your criteria. Let's try different options.`,
          options: ["Change criteria"]
        };
      }
      
      return await getCarDisplayChunk(session);

    case 'show_more_cars':
      console.log("🔄 Step matched: show_more_cars");
      
      // Handle SELECT button responses
      if (userMessage === "SELECT") {
        const cars = session.filteredCars || [];
        const currentCar = cars[session.carIndex];
        
        if (currentCar) {
          session.selectedCar = `${currentCar.make} ${currentCar.model} ${currentCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "Change My Criteria"]
          };
        }
      }
      
      // Handle SELECT button responses (format: book_Make_Model_Variant) - legacy support
      if (userMessage.startsWith("book_")) {
        const carId = userMessage;
        const cars = session.filteredCars || [];
        
        // Find the car by ID
        const selectedCar = cars.find(car => {
          const carIdFromCar = `book_${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
          return carIdFromCar === carId;
        });
        
        if (selectedCar) {
          session.selectedCar = `${selectedCar.make} ${selectedCar.model} ${selectedCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "Change My Criteria"]
          };
        }
      }
      
      // Handle "Browse More Cars" button
      if (userMessage === "Browse More Cars") {
        session.carIndex += 3;
        const cars = session.filteredCars || [];
        
        if (session.carIndex >= cars.length) {
          return {
            message: "No more cars available. Would you like to change your criteria?",
            options: ["Change criteria"]
          };
        }
        
        return await getCarDisplayChunk(session);
      }
      
      // Handle "Change criteria" selection
      if (userMessage === "Change criteria" || userMessage === "Change My Criteria") {
        session.step = 'browse_start';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        return {
          message: "No problem! Let's find you a different car. What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // If it's a car selection (legacy support)
      session.selectedCar = userMessage;
      session.step = 'test_drive_date';
      return {
        message: `Excellent! Let's schedule your ${userMessage} test drive. When would you prefer?`,
        options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
      };

    case 'car_selected_options':
      console.log("🔄 Step matched: car_selected_options");
      
      if (userMessage === "Book Test Drive") {
        session.step = 'test_drive_date';
        return {
          message: `Excellent! Let's schedule your ${session.selectedCar} test drive. When would you prefer?`,
          options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
        };
      }
      
      if (userMessage === "Change My Criteria") {
        session.step = 'browse_start';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        return {
          message: "No problem! Let's find you a different car. What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }

    case 'test_drive_date':
      console.log("🔄 Step matched: test_drive_date");
      session.testDriveDate = userMessage;
      
      if (["Today", "Tomorrow"].includes(userMessage)) {
        session.step = 'test_drive_time';
        return {
          message: "Perfect! Which time works better for you?",
          options: getTimeSlots()
        };
      } else {
        session.step = 'test_drive_day';
        return {
          message: "Which day works best for you?",
          options: getNextAvailableDays(userMessage)
        };
      }

    case 'test_drive_day':
      console.log("🔄 Step matched: test_drive_day");
      session.testDriveDay = userMessage;
      session.step = 'test_drive_time';
      return {
        message: "Perfect! What time works best?",
        options: getTimeSlots()
      };

    case 'test_drive_time':
      console.log("🔄 Step matched: test_drive_time");
      session.testDriveTime = userMessage;
      session.step = 'td_name';
      return { message: "Great! I need some details to confirm your booking:\n\n1. Your Name:" };

    case 'td_name':
      console.log("🔄 Step matched: td_name");
      session.td_name = userMessage;
      session.step = 'td_phone';
      return { message: "2. Your Phone Number:" };

    case 'td_phone':
      console.log("🔄 Step matched: td_phone");
      session.td_phone = userMessage;
      session.step = 'td_license';
      return {
        message: "3. Do you have a valid driving license?",
        options: ["Yes", "No"]
      };

    case 'td_license':
      console.log("🔄 Step matched: td_license");
      session.td_license = userMessage;
      session.step = 'td_location_mode';
      return {
        message: "Thank you! Where would you like to take the test drive?",
        options: ["Showroom pickup", "Home pickup"]
      };

    case 'td_location_mode':
      console.log("🔄 Step matched: td_location_mode");
      console.log("🔍 Debug - userMessage:", userMessage);
      session.td_location_mode = userMessage;
      console.log("🔍 Debug - session.td_location_mode set to:", session.td_location_mode);
      if (userMessage.includes("Home pickup")) {
        session.step = 'td_home_address';
        return { message: "Please share your current address for the test drive:" };
      } else {
        session.step = 'test_drive_confirmation';
        return getTestDriveConfirmation(session);
      }

    case 'td_home_address':
      console.log("🔄 Step matched: td_home_address");
      session.td_home_address = userMessage;
      session.step = 'test_drive_confirmation';
      return getTestDriveConfirmation(session);

    case 'td_drop_location':
      console.log("🔄 Step matched: td_drop_location");
      session.td_drop_location = userMessage;
      session.step = 'test_drive_confirmation';
      return getTestDriveConfirmation(session);

    case 'test_drive_confirmation':
      console.log("🔄 Step matched: test_drive_confirmation");
      
      if (userMessage === "Confirm") {
        // Save test drive details to database
        try {
          // Create datetime from date and time
          const testDriveDate = session.testDriveDate === 'Today' || session.testDriveDate === 'Tomorrow' ? session.testDriveDate : (session.testDriveDay || 'Not selected');
          const testDriveTime = session.testDriveTime || 'Not selected';
          
          // For now, use a default datetime since we need to parse the date/time properly
          const datetime = new Date();
          
          await pool.query(`
            INSERT INTO test_drives 
            (user_id, car, datetime, name, phone, has_dl, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [
            session.userId || 'unknown', // You might need to pass userId in session
            session.selectedCar || 'Not selected',
            datetime,
            session.td_name || 'Not provided',
            session.td_phone || 'Not provided',
            session.td_license ? true : false // Convert license info to boolean
          ]);
          console.log("✅ Test drive details saved to database");
        } catch (error) {
          console.error("❌ Error saving test drive details:", error);
        }
        
        session.step = 'booking_complete';
        return {
          message: "Thank you! Your test drive has been confirmed. We'll contact you shortly to finalize the details.",
          options: ["Explore More", "End Conversation"]
        };
      }
      
      if (userMessage === "Reject") {
        session.step = 'browse_start';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        return {
          message: "No problem! Let's find you a different car. What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // If user sends all other message, show confirmation again
      return getTestDriveConfirmation(session);

    case 'booking_complete':
      console.log("🔄 Step matched: booking_complete");
      
      if (userMessage === "Explore More") {
        session.step = 'browse_start';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        return {
          message: "Welcome! Let's find your perfect car. What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      if (userMessage === "End Conversation") {
        // Set a flag to prevent greeting message from showing again
        session.conversationEnded = true;
        // Clear other session data but keep the flag
        const conversationEnded = true;
        Object.keys(session).forEach(key => {
          delete session[key];
        });
        session.conversationEnded = conversationEnded;
        return null; // Return null to indicate no message should be sent
      }
      
      return {
        message: "Please select an option:",
        options: ["Explore More", "End Conversation"]
      };

    case 'change_criteria_confirm':
      console.log("🔄 Step matched: change_criteria_confirm");
      if (userMessage.toLowerCase().includes("yes") || userMessage.toLowerCase().includes("proceed")) {
        session.step = 'browse_start';
        return await handleBrowseUsedCars(session, "start over");
      } else {
        return { message: "Okay, keeping your current selection intact." };
      }

    default:
      console.log("❌ Step not recognized, restarting...");
      return { message: "Something went wrong. Let's start again.", options: ["🏁 Start Again"] };
  }
}

async function getCarDisplayChunk(session) {
  const cars = session.filteredCars || [];
  
  if (cars.length === 0) {
    return { message: "No more cars to display.", options: ["Change criteria"] };
  }

  // Show up to 3 cars at a time
  const startIndex = session.carIndex;
  const endIndex = Math.min(startIndex + 3, cars.length);
  const carsToShow = cars.slice(startIndex, endIndex);

  const messages = [];
  
  for (let i = 0; i < carsToShow.length; i++) {
    const car = carsToShow[i];
    const file = `${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_') + '.png';
    const imagePath = path.join(__dirname, '..', 'images', file);
    const caption =
      `🚗 ${car.make} ${car.model} ${car.variant}\n` +
      `📅 Year: ${car.manufacturing_year}\n` +
      `⛽ Fuel: ${car.fuel_type}\n` +
      `💰 Price: ${formatRupees(car.estimated_selling_price)}`;

    // Check if image exists
    const imageExists = fs.existsSync(imagePath);
    
    if (imageExists) {
      // Add image message if file exists
      const url = `${process.env.NGROK_URL || 'http://localhost:3000'}/images/${file}`;
      messages.push({
        type: 'image',
        image: { link: url, caption: caption }
      });
    } else {
      // Add text message with car details if image doesn't exist
      messages.push({
        type: 'text',
        text: { body: caption }
      });
    }

    // Add SELECT button message for each car
    const carId = `book_${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
    messages.push({
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'SELECT' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: carId,
                title: 'SELECT'
              }
            }
          ]
        }
      }
    });
  }

  // Add "Browse More Cars" button if there are more cars to show
  const hasMoreCars = endIndex < cars.length;
  
  let messageText = `Showing cars ${startIndex + 1}-${endIndex} of ${cars.length}:`;
  
  const final = {
    message: messageText,
    messages: messages
  };
  
  // Always add "Browse More Cars" option if there are more cars
  if (hasMoreCars) {
    final.options = ["Browse More Cars"];
    console.log("🔍 Adding Browse More Cars button - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  } else {
    final.message += "\n\nNo more cars available.";
    final.options = ["Change criteria"];
    console.log("🔍 No more cars to show - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  }
  
  console.log("🔍 Final response structure:", JSON.stringify(final, null, 2));
  
  session.step = 'show_more_cars';
  return final;
}

function getTestDriveConfirmation(session) {
  console.log("🔍 Debug - session.td_location_mode:", session.td_location_mode);
  console.log("🔍 Debug - session.td_home_address:", session.td_home_address);
  console.log("🔍 Debug - session.td_drop_location:", session.td_drop_location);
  
  let locationText;
  
  // Check for different location modes
  const locationMode = session.td_location_mode ? session.td_location_mode.toLowerCase() : '';
  console.log("🔍 Debug - Location mode:", locationMode);
  
  if (locationMode === "home pickup") {
    locationText = `\n📍 Test Drive Location: ${session.td_home_address || 'To be confirmed'}`;
    console.log("🔍 Debug - Using home address:", session.td_home_address);
  } else if (locationMode === "showroom pickup") {
    locationText = "\n📍 Showroom Address: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n🅿️ Free parking available";
    console.log("🔍 Debug - Using showroom address");
  } else if (locationMode.includes("delivery")) {
    locationText = `\n📍 Test Drive Location: ${session.td_drop_location || 'To be confirmed'}`;
    console.log("🔍 Debug - Using delivery address:", session.td_drop_location);
  } else {
    locationText = "\n📍 Test Drive Location: To be confirmed";
    console.log("🔍 Debug - Using default location");
  }

  return {
    message: `Perfect! Here's your test drive confirmation:

📋 TEST DRIVE CONFIRMED:
👤 Name: ${session.td_name || 'Not provided'}
📱 Phone: ${session.td_phone || 'Not provided'}
🚗 Car: ${session.selectedCar || 'Not selected'}
📅 Date: ${session.testDriveDate === 'Today' || session.testDriveDate === 'Tomorrow' ? session.testDriveDate : (session.testDriveDay || 'Not selected')}
⏰ Time: ${session.testDriveTime || 'Not selected'}
${locationText}

What to bring:
✅ Valid driving license
✅ all photo ID
📞 Need help? Call us: +91-9876543210
Quick reminder: We'll also have financing options ready if you like the car during your test drive!

Please confirm your booking:`,
    options: ["Confirm", "Reject"]
  };
}

module.exports = { handleBrowseUsedCars };