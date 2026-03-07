// Fetch products from backend API
export const getProducts = async () => {
  try {
    // FIX: Port badal kar 5005 kar diya gaya hai
    const response = await fetch('http://localhost:5005/api/products');
    
    if (!response.ok) {
        throw new Error("Server response was not ok");
    }

    const data = await response.json();
    console.log("Products loaded successfully:", data);
    return data;
  } catch (err) {
    console.error('Failed to fetch products from Port 5005:', err);
    return [];
  }
};

// Keep this for backward compatibility
export const products = [];