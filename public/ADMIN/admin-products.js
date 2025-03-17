 // Sample product data
 const products = [
    { 
        id: 'PRD001', 
        name: 'Premium Dog Food', 
        category: 'Pet Food', 
        price: 24.99, 
        stock: 43, 
        addedDate: 'Feb 15, 2025',
        status: 'in-stock'
    },
    { 
        id: 'PRD002', 
        name: 'Cat Scratching Post', 
        category: 'Cat Supplies', 
        price: 39.99, 
        stock: 18, 
        addedDate: 'Feb 10, 2025',
        status: 'in-stock'
    },
    { 
        id: 'PRD003', 
        name: 'Pet Carrier', 
        category: 'Travel', 
        price: 54.99, 
        stock: 7, 
        addedDate: 'Feb 5, 2025',
        status: 'low-stock'
    },
    { 
        id: 'PRD004', 
        name: 'Dog Leash', 
        category: 'Dog Supplies', 
        price: 15.99, 
        stock: 25, 
        addedDate: 'Jan 28, 2025',
        status: 'in-stock'
    },
    { 
        id: 'PRD005', 
        name: 'Bird Cage', 
        category: 'Bird Supplies', 
        price: 89.99, 
        stock: 0, 
        addedDate: 'Jan 25, 2025',
        status: 'out-of-stock'
    },
    { 
        id: 'PRD006', 
        name: 'Fish Tank Filter', 
        category: 'Aquarium', 
        price: 32.50, 
        stock: 5, 
        addedDate: 'Jan 20, 2025',
        status: 'low-stock'
    },
    { 
        id: 'PRD007', 
        name: 'Pet Shampoo', 
        category: 'Grooming', 
        price: 12.99, 
        stock: 35, 
        addedDate: 'Jan 18, 2025',
        status: 'in-stock'
    },
    { 
        id: 'PRD008', 
        name: 'Hamster Wheel', 
        category: 'Small Pets', 
        price: 9.99, 
        stock: 0, 
        addedDate: 'Jan 15, 2025',
        status: 'out-of-stock'
    }
];

// Additional product details (can be stored in localStorage or accessed via API in a real application)
const productDetails = {
    'PRD001': {
        description: 'High-quality premium dog food with balanced nutrition for adult dogs.',
        brand: 'PawPerfect',
        weight: '15 lbs',
        ingredients: 'Chicken, Brown Rice, Vegetables, Vitamins & Minerals',
        sku: 'DOGFD-1501',
        barcode: '8901234567890',
        salesCount: 124,
        ratings: 4.8
    },
    'PRD002': {
        description: 'Durable cat scratching post with soft perch and dangling toy.',
        brand: 'FeliFun',
        weight: '8 lbs',
        material: 'Sisal rope, cardboard, plush',
        sku: 'CATSCP-3921',
        barcode: '8901234567891',
        salesCount: 87,
        ratings: 4.5
    },
    'PRD003': {
        description: 'Airline approved pet carrier with ventilation and comfortable padding.',
        brand: 'TravelPet',
        dimensions: '18" x 11" x 11"',
        material: 'Nylon, Mesh',
        sku: 'PETCR-5402',
        barcode: '8901234567892',
        salesCount: 56,
        ratings: 4.7
    },
    'PRD004': {
        description: 'Durable nylon dog leash with comfortable handle grip.',
        brand: 'WalkBuddy',
        length: '6 ft',
        material: 'Nylon, Rubber',
        sku: 'DOGL-2135',
        barcode: '8901234567893',
        salesCount: 210,
        ratings: 4.6
    },
    'PRD005': {
        description: 'Spacious bird cage with multiple perches and feeding stations.',
        brand: 'BirdHaven',
        dimensions: '24" x 16" x 32"',
        material: 'Stainless Steel',
        sku: 'BRDCG-7821',
        barcode: '8901234567894',
        salesCount: 34,
        ratings: 4.4
    },
    'PRD006': {
        description: 'Efficient aquarium filter suitable for tanks up to 30 gallons.',
        brand: 'AquaClear',
        flow: '200 GPH',
        filterType: 'Hang-On-Back',
        sku: 'AQFLT-4298',
        barcode: '8901234567895',
        salesCount: 76,
        ratings: 4.3
    },
    'PRD007': {
        description: 'Gentle pet shampoo suitable for all breeds with aloe vera extract.',
        brand: 'CleanPet',
        volume: '16 oz',
        ingredients: 'Water, Coconut-based cleaners, Aloe Vera, Chamomile',
        sku: 'PETSH-6573',
        barcode: '8901234567896',
        salesCount: 148,
        ratings: 4.7
    },
    'PRD008': {
        description: 'Silent spinner exercise wheel for hamsters and small rodents.',
        brand: 'RodentFun',
        diameter: '5 inches',
        material: 'Plastic, Metal',
        sku: 'HMWHL-3158',
        barcode: '8901234567897',
        salesCount: 92,
        ratings: 4.2
    }
};

// DOM Elements
const productTableBody = document.getElementById('productTableBody');
const productSearchInput = document.getElementById('productSearchInput');
const filterBtn = document.getElementById('filterBtn');
const addProductBtn = document.getElementById('addProductBtn');

// Store product details in localStorage for access from product-details.html
localStorage.setItem('productDetails', JSON.stringify(productDetails));
localStorage.setItem('products', JSON.stringify(products));

// Load products when the page loads
document.addEventListener('DOMContentLoaded', function() {
    displayProducts(products);
    setupEventListeners();
});

// Display products in the table
function displayProducts(productsToDisplay) {
    productTableBody.innerHTML = '';
    
    productsToDisplay.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>#${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.stock > 0 ? product.stock : 'Out of Stock'}</td>
            <td>${product.addedDate}</td>
            <td>
                <a href="admin-product-details?id=${product.id}" class="action-btn">View</a>
                <a href="admin-product-details" class="action-btn edit-product" data-id="${product.id}">Edit</a>
            </td>
        `;
        
        productTableBody.appendChild(row);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });
}

// Filter products based on search input
function filterProducts() {
    const searchTerm = productSearchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        displayProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.id.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    
    displayProducts(filteredProducts);
}

// Edit product function
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        // In a real application, this would open an edit form
        alert(`Editing product: ${product.name}`);
    }
}

// Add new product function
function addNewProduct() {
    // In a real application, this would open a form to add a new product
    alert('Add new product form will open here');
}

// Set up event listeners
function setupEventListeners() {
    if (productSearchInput) {
        productSearchInput.addEventListener('input', filterProducts);
    }
    
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            // Implement filter functionality here
            alert('Filter functionality coming soon!');
        });
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', addNewProduct);
    }
}

