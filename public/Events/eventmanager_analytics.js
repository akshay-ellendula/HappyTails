      // This function will run after the entire HTML page has loaded
      document.addEventListener("DOMContentLoaded", () => {
        // 1. Get the source element that contains the total revenue
        const revenueSourceElement = document.getElementById(
          "total-revenue-source"
        );
        // 2. Read the text content (e.g., "₹55000.00") and convert it to a number
        //    - .replace(/[₹,]/g, '') removes the currency symbol and any commas
        //    - parseFloat() converts the string to a number
        const totalRevenue = parseFloat(
          revenueSourceElement.textContent.replace(/[₹,]/g, "")
        );

        // 3. Perform the calculations
        const platformCharges = totalRevenue * 0.06; // 6% charge
        const finalEarnings = totalRevenue - platformCharges;

        // 4. Get the target elements in the new card
        const breakdownTotalEl = document.getElementById(
          "breakdown-total-revenue"
        );
        const platformChargesEl = document.getElementById("platform-charges");
        const finalEarningsEl = document.getElementById("final-earnings");

        // 5. Update the new card with the calculated values, formatting them as currency
        if (!isNaN(totalRevenue)) {
          breakdownTotalEl.textContent = `₹${totalRevenue.toFixed(2)}`;
          platformChargesEl.textContent = `- ₹${platformCharges.toFixed(2)}`;
          finalEarningsEl.textContent = `₹${finalEarnings.toFixed(2)}`;
        }
      });