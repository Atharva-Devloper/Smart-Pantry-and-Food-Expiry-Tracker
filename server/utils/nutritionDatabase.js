// Real nutritional data for common food items
// Values are per standard serving size (100g unless specified)
const nutritionDatabase = {
  // Fruits (per 100g)
  'Apples': {
    calories: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
    fiber: 2.4,
    sugar: 10.4,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Bananas': {
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    fiber: 2.6,
    sugar: 12.2,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Oranges': {
    calories: 47,
    protein: 0.9,
    carbs: 12,
    fat: 0.1,
    fiber: 2.4,
    sugar: 9.4,
    sodium: 0,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Strawberries': {
    calories: 32,
    protein: 0.7,
    carbs: 8,
    fat: 0.3,
    fiber: 2.0,
    sugar: 4.9,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Grapes': {
    calories: 69,
    protein: 0.7,
    carbs: 18,
    fat: 0.2,
    fiber: 0.9,
    sugar: 15.5,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Mangoes': {
    calories: 60,
    protein: 0.8,
    carbs: 15,
    fat: 0.4,
    fiber: 1.6,
    sugar: 13.7,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Vegetables (per 100g)
  'Broccoli': {
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fat: 0.4,
    fiber: 2.6,
    sugar: 1.5,
    sodium: 33,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Carrots': {
    calories: 41,
    protein: 0.9,
    carbs: 10,
    fat: 0.2,
    fiber: 2.8,
    sugar: 4.7,
    sodium: 69,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Spinach': {
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    sugar: 0.4,
    sodium: 79,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Tomatoes': {
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    sugar: 2.6,
    sodium: 5,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Lettuce': {
    calories: 15,
    protein: 1.4,
    carbs: 2.9,
    fat: 0.2,
    fiber: 1.3,
    sugar: 0.8,
    sodium: 28,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Cucumbers': {
    calories: 16,
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    fiber: 0.5,
    sugar: 1.7,
    sodium: 2,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Dairy (per standard serving)
  'Milk': {
    calories: 42,
    protein: 3.4,
    carbs: 5.0,
    fat: 1.0,
    fiber: 0,
    sugar: 5.0,
    sodium: 44,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Yogurt': {
    calories: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    fiber: 0,
    sugar: 3.6,
    sodium: 36,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Cheese': {
    calories: 402,
    protein: 25,
    carbs: 1.3,
    fat: 33,
    fiber: 0,
    sugar: 0.5,
    sodium: 621,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Butter': {
    calories: 717,
    protein: 0.9,
    carbs: 0.1,
    fat: 81,
    fiber: 0,
    sugar: 0.1,
    sodium: 11,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Cream': {
    calories: 340,
    protein: 2.8,
    carbs: 2.9,
    fat: 37,
    fiber: 0,
    sugar: 2.9,
    sodium: 31,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Meat (per 100g)
  'Chicken Breast': {
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Ground Beef': {
    calories: 250,
    protein: 26,
    carbs: 0,
    fat: 15,
    fiber: 0,
    sugar: 0,
    sodium: 72,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Turkey': {
    calories: 135,
    protein: 30,
    carbs: 0,
    fat: 1.5,
    fiber: 0,
    sugar: 0,
    sodium: 63,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Pork Chops': {
    calories: 231,
    protein: 27,
    carbs: 0,
    fat: 14,
    fiber: 0,
    sugar: 0,
    sodium: 66,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Grains (per standard serving)
  'Bread': {
    calories: 265,
    protein: 9,
    carbs: 49,
    fat: 3.2,
    fiber: 2.7,
    sugar: 5.0,
    sodium: 491,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Rice': {
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    fiber: 0.4,
    sugar: 0.1,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Pasta': {
    calories: 131,
    protein: 5.0,
    carbs: 25,
    fat: 1.1,
    fiber: 1.8,
    sugar: 0.6,
    sodium: 6,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Cereal': {
    calories: 379,
    protein: 7.0,
    carbs: 80,
    fat: 2.5,
    fiber: 6.5,
    sugar: 15,
    sodium: 580,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Snacks (per standard serving)
  'Chips': {
    calories: 536,
    protein: 7.0,
    carbs: 53,
    fat: 35,
    fiber: 4.8,
    sugar: 2.0,
    sodium: 640,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Cookies': {
    calories: 502,
    protein: 5.8,
    carbs: 64,
    fat: 25,
    fiber: 2.8,
    sugar: 38,
    sodium: 375,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Granola': {
    calories: 489,
    protein: 10,
    carbs: 67,
    fat: 22,
    fiber: 6.7,
    sugar: 20,
    sodium: 168,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Nuts': {
    calories: 607,
    protein: 20,
    carbs: 21,
    fat: 54,
    fiber: 7.0,
    sugar: 4.4,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Beverages (per 100ml)
  'Juice': {
    calories: 45,
    protein: 0.7,
    carbs: 11,
    fat: 0.2,
    fiber: 0.2,
    sugar: 10,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Coffee': {
    calories: 1,
    protein: 0.1,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Tea': {
    calories: 1,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Soda': {
    calories: 41,
    protein: 0,
    carbs: 11,
    fat: 0,
    fiber: 0,
    sugar: 11,
    sodium: 4,
    servingSize: 100,
    servingUnit: 'grams'
  },

  // Condiments (per standard serving)
  'Ketchup': {
    calories: 101,
    protein: 1.0,
    carbs: 27,
    fat: 0.2,
    fiber: 0.3,
    sugar: 22,
    sodium: 1100,
    servingSize: 15,
    servingUnit: 'tablespoons'
  },
  'Mustard': {
    calories: 66,
    protein: 4.0,
    carbs: 5.8,
    fat: 3.6,
    fiber: 3.3,
    sugar: 0.9,
    sodium: 1100,
    servingSize: 15,
    servingUnit: 'tablespoons'
  },
  'Olive Oil': {
    calories: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    fiber: 0,
    sugar: 0,
    sodium: 2,
    servingSize: 15,
    servingUnit: 'tablespoons'
  },
  'Vinegar': {
    calories: 18,
    protein: 0,
    carbs: 0.9,
    fat: 0,
    fiber: 0,
    sugar: 0.4,
    sodium: 5,
    servingSize: 15,
    servingUnit: 'tablespoons'
  },

  // Frozen Foods (per standard serving)
  'Frozen Vegetables': {
    calories: 35,
    protein: 2.0,
    carbs: 7.0,
    fat: 0.3,
    fiber: 3.0,
    sugar: 3.0,
    sodium: 50,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Frozen Pizza': {
    calories: 269,
    protein: 11,
    carbs: 33,
    fat: 11,
    fiber: 2.2,
    sugar: 3.8,
    sodium: 540,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Ice Cream': {
    calories: 207,
    protein: 3.5,
    carbs: 24,
    fat: 11,
    fiber: 0.7,
    sugar: 21,
    sodium: 56,
    servingSize: 100,
    servingUnit: 'grams'
  },
  'Frozen Berries': {
    calories: 52,
    protein: 0.4,
    carbs: 12,
    fat: 0.2,
    fiber: 2.3,
    sugar: 8.0,
    sodium: 1,
    servingSize: 100,
    servingUnit: 'grams'
  }
};

// Function to get nutrition data for a food item
function getNutritionData(foodName) {
  return nutritionDatabase[foodName] || null;
}

// Function to search for food items (case-insensitive partial match)
function searchFoodItems(query) {
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  for (const [itemName, nutritionData] of Object.entries(nutritionDatabase)) {
    if (itemName.toLowerCase().includes(lowerQuery)) {
      results.push({
        name: itemName,
        ...nutritionData
      });
    }
  }
  
  return results;
}

// Function to calculate nutrition for a specific quantity
function calculateNutrition(foodName, quantity, unit = 'pieces') {
  const nutritionData = getNutritionData(foodName);
  
  if (!nutritionData) {
    return null;
  }
  
  const multiplier = quantity / nutritionData.servingSize;
  
  return {
    calories: Math.round(nutritionData.calories * multiplier),
    protein: Math.round((nutritionData.protein * multiplier) * 10) / 10,
    carbs: Math.round((nutritionData.carbs * multiplier) * 10) / 10,
    fat: Math.round((nutritionData.fat * multiplier) * 10) / 10,
    fiber: Math.round((nutritionData.fiber * multiplier) * 10) / 10,
    sugar: Math.round((nutritionData.sugar * multiplier) * 10) / 10,
    sodium: Math.round(nutritionData.sodium * multiplier),
    servingSize: nutritionData.servingSize,
    servingUnit: nutritionData.servingUnit
  };
}

// Helper function to calculate quantity deduction from pantry items
function calculateQuantityDeduction(consumedQuantity, consumedUnit, pantryQuantity, pantryUnit) {
  // Handle undefined or null values
  if (!consumedQuantity || !consumedUnit || !pantryQuantity || !pantryUnit) {
    return 0;
  }

  // Conversion factors to grams (base unit)
  const toGrams = {
    'grams': 1,
    'g': 1,
    'pieces': 30, // Average piece weight
    'piece': 30,
    'cups': 240,
    'cup': 240,
    'ounces': 28.35,
    'oz': 28.35,
    'tablespoons': 15,
    'tbsp': 15,
    'teaspoons': 5,
    'tsp': 5,
    'ml': 1, // For liquids, treat ml as grams
    'liters': 1000,
    'l': 1000
  };

  // Convert consumed quantity to grams
  const consumedUnitLower = (consumedUnit || '').toLowerCase();
  const pantryUnitLower = (pantryUnit || '').toLowerCase();
  
  const consumedInGrams = consumedQuantity * (toGrams[consumedUnitLower] || 1);
  
  // Convert pantry quantity to grams
  const pantryInGrams = pantryQuantity * (toGrams[pantryUnitLower] || 1);
  
  // Calculate the equivalent deduction in pantry unit
  const deductionInGrams = Math.min(consumedInGrams, pantryInGrams);
  const deductionInPantryUnit = deductionInGrams / (toGrams[pantryUnitLower] || 1);
  
  return Math.round(deductionInPantryUnit * 100) / 100; // Round to 2 decimal places
}

module.exports = {
  nutritionDatabase,
  getNutritionData,
  searchFoodItems,
  calculateNutrition,
  calculateQuantityDeduction
};
