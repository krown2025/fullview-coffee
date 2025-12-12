const Cart = {
    items: [],

    init() {
        const stored = localStorage.getItem('cart');
        if (stored) {
            this.items = JSON.parse(stored);
        }
        this.updateUI();
    },

    add(product, options = []) {
        // Refresh items from storage to ensure we have the latest state
        const stored = localStorage.getItem('cart');
        if (stored) {
            this.items = JSON.parse(stored);
        }

        // Create a unique key for this combination
        const optionsKey = JSON.stringify(options.sort((a, b) => a.name.localeCompare(b.name)));
        // We use a composite ID or just rely on finding by ID + Options
        const existing = this.items.find(i => i.id === product.id && JSON.stringify(i.options) === optionsKey);

        // Use effective_price (discounted) if available, else base_price
        const basePrice = product.effective_price ? parseFloat(product.effective_price) : parseFloat(product.base_price);

        // Calculate unit price with options
        let unitPrice = basePrice;
        options.forEach(opt => unitPrice += opt.price);

        if (existing) {
            existing.quantity++;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: unitPrice,
                base_price: basePrice,
                quantity: 1,
                options: options
            });
        }
        this.save();
        this.updateUI();
    },

    updateQuantity(index, change) {
        if (this.items[index]) {
            this.items[index].quantity += change;
            if (this.items[index].quantity <= 0) {
                this.items.splice(index, 1);
            }
            this.save();
            this.updateUI();
        }
    },

    remove(index) {
        // Remove by index since ID is not unique anymore
        this.items.splice(index, 1);
        this.save();
        this.updateUI();
    },

    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },

    total() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    updateUI() {
        const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountEl = document.getElementById('cart-count');
        if (cartCountEl) cartCountEl.innerText = count;

        // If on checkout page, render items
        const cartTable = document.getElementById('cart-table-body');
        const totalEl = document.getElementById('cart-total');

        if (cartTable && totalEl) {
            cartTable.innerHTML = '';
            this.items.forEach((item, index) => {
                const optionsStr = item.options ? item.options.map(o => o.name).join(', ') : '';
                cartTable.innerHTML += `
                    <tr>
                        <td>
                            ${item.name}
                            ${optionsStr ? `<br><small class="text-muted">${optionsStr}</small>` : ''}
                        </td>
                        <td>
                            <div class="input-group input-group-sm" style="width: 100px;">
                                <button class="btn btn-outline-secondary" type="button" onclick="Cart.updateQuantity(${index}, -1)">-</button>
                                <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                                <button class="btn btn-outline-secondary" type="button" onclick="Cart.updateQuantity(${index}, 1)">+</button>
                            </div>
                        </td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="Cart.remove(${index})">X</button></td>
                    </tr>
                `;
            });
            totalEl.innerText = this.total().toFixed(2);

            // Update hidden input
            const cartInput = document.getElementById('cart-input');
            const totalInput = document.getElementById('total-input');
            if (cartInput) cartInput.value = JSON.stringify(this.items.map(i => ({
                product_id: i.id,
                quantity: i.quantity,
                price: i.price,
                options: i.options
            })));
            if (totalInput) totalInput.value = this.total().toFixed(2);

            // Update subtotal if exists
            const subtotalEl = document.getElementById('cart-subtotal');
            if (subtotalEl) subtotalEl.innerText = this.total().toFixed(2);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
});
