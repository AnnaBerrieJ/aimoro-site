let savedSuppliers = [];

function getRiskClass(riskLevel) {
    if (riskLevel === "Low Risk") {
        return "risk-low";
    }

    if (riskLevel === "Medium Risk") {
        return "risk-medium";
    }

    if (riskLevel === "High Risk") {
        return "risk-high";
    }

    return "";
}

function updateSummaryCards(suppliers) {
    const totalSuppliers = suppliers.length;

    const verifiedSuppliers = suppliers.filter(
        supplier => supplier.verified
    ).length;

    const averagePrice = suppliers.length > 0
        ? suppliers.reduce(
            (sum, supplier) => sum + supplier.unit_price,
            0
        ) / suppliers.length
        : 0;

    document.getElementById("total-suppliers").textContent =
        totalSuppliers;

    document.getElementById("verified-suppliers").textContent =
        verifiedSuppliers;

    document.getElementById("average-price").textContent =
        `$${averagePrice.toFixed(2)}`;
}

function saveSupplier(supplierName) {
    if (!savedSuppliers.includes(supplierName)) {
        savedSuppliers.push(supplierName);
    }

    alert(`${supplierName} saved to favorites.`);
}

async function loadSuppliers() {
    const product = document.getElementById("product-search").value;
    const country = document.getElementById("country-filter").value;
    const maxPrice =
        document.getElementById("max-price-filter").value || 999999;

    const verified =
        document.getElementById("verified-filter").checked;

    const url =
        `http://127.0.0.1:8000/suppliers?product=${product}&country=${country}&max_price=${maxPrice}&verified=${verified}`;

    const response = await fetch(url);
    const suppliers = await response.json();

    updateSummaryCards(suppliers);

    const supplierList = document.getElementById("supplier-list");
    supplierList.innerHTML = "";

    if (suppliers.length === 0) {
        supplierList.innerHTML = "<p>No suppliers found.</p>";
        return;
    }

    suppliers.forEach((supplier, index) => {
        const card = document.createElement("div");
        card.className = "supplier-card";

        card.innerHTML = `
            ${index === 0 ? '<div class="best-match">Best Match</div>' : ''}

            <h2>${supplier.name}</h2>

            <p><strong>Country:</strong> ${supplier.country}</p>
            <p><strong>Product:</strong> ${supplier.product}</p>
            <p><strong>Unit Price:</strong> $${supplier.unit_price}</p>
            <p><strong>MOQ:</strong> ${supplier.minimum_order_quantity}</p>
            <p><strong>Rating:</strong> ${supplier.rating}</p>
            <p><strong>Delivery:</strong> ${supplier.delivery_days} days</p>
            <p><strong>Verified:</strong> ${supplier.verified ? "Yes" : "No"}</p>

            <p>
                <strong>Risk Level:</strong>
                <span class="risk-badge ${getRiskClass(supplier.risk_level)}">
                    ${supplier.risk_level}
                </span>
            </p>

            <h3>Aimoro Score: ${supplier.aimoro_score}</h3>

            <p class="recommendation">
                <strong>AI Recommendation:</strong>
                ${supplier.recommendation || "No recommendation available yet."}
            </p>

            <button onclick="saveSupplier('${supplier.name}')">
                Save Supplier
            </button>
        `;

        supplierList.appendChild(card);
    });
}

loadSuppliers();