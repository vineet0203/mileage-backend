/**
 * Dummy function to simulate odometer mileage extraction from an image URL.
 * In a real-world scenario, this would call an OCR service or use a ML model.
 * 
 * @param {string} imageUrl - The URL of the odometer image.
 * @returns {Promise<number>} - The extracted mileage reading.
 */
export const extractMileageFromImage = async (imageUrl) => {
  // Simulate network delay or processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!imageUrl) {
    return 0;
  }

  // Return a mock value for now. 
  // For testing: if imageUrl is a number string, return it.
  const testValue = parseFloat(imageUrl);
  if (!isNaN(testValue)) {
    return testValue;
  }

  return 1000.00;
};
