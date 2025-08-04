document.addEventListener("DOMContentLoaded", function () {
  const listings = document.querySelectorAll(".listing-card");
  const overlay = document.getElementById("profileOverlay");
  const closeBtn = document.getElementById("closeOverlay");

  // Sample data (you can replace with real data later or fetch from JSON)
  const sampleData = {
    name: "Al Noor Bakery",
    category: "Food & Beverage",
    description: "Started with a dream to bring fresh sourdough to Kuwait using traditional fermentation.",
    image: "images/sample-logo.png",
    website: "https://example.com",
    instagram: "https://instagram.com"
  };

  listings.forEach(card => {
    card.addEventListener("click", () => {
      // Fill overlay with data (replace sampleData with real dynamic data if needed)
      document.getElementById("overlayImage").src = sampleData.image;
      document.getElementById("overlayName").textContent = sampleData.name;
      document.getElementById("overlayCategory").textContent = sampleData.category;
      document.getElementById("overlayDescription").textContent = sampleData.description;
      document.getElementById("overlayWebsite").href = sampleData.website;
      document.getElementById("overlayInstagram").href = sampleData.instagram;

      overlay.classList.add("show");
      overlay.classList.remove("hidden");
    });
  });

  closeBtn.addEventListener("click", () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.classList.add("hidden"), 300);
  });
});
