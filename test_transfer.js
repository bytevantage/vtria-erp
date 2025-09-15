const axios = require('axios');

async function testTransferRequest() {
  try {
    const response = await axios.post('http://localhost:3002/api/multi-location-inventory/transfer-request', {
      from_location_id: 1,
      to_location_id: 2,
      requested_by: 1,
      items: [
        {
          product_id: 1,
          quantity: 5,
          notes: "Urgent transfer for project"
        }
      ]
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testTransferRequest();