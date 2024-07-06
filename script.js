const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const itemsElement = document.getElementById('items');
const moneyElement = document.getElementById('money');
const restockButton = document.getElementById('restock');
let money = 100;

const tileSize = 30;
const rows = 10;
const cols = 20;
const streetRow = 9;
const shopStartCol = 10;
const shopEndCol = 14;
const cashierPosition = { row: 5, col: 12 };
let npcs = [];

const tileMap = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const items = [
    { name: 'Potion', price: 10, defaultPrice: 10, stock: 5, sold: 0, demand: 100 },
    { name: 'Sword', price: 50, defaultPrice: 50, stock: 2, sold: 0, demand: 100 },
    { name: 'Shield', price: 30, defaultPrice: 30, stock: 3, sold: 0, demand: 100 }
];

const renderGrid = () => {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (tileMap[row][col] === 0) {
                ctx.fillStyle = 'gray';
            } else if (tileMap[row][col] === 1) {
                ctx.fillStyle = 'brown';
            } else if (tileMap[row][col] === 2) {
                ctx.fillStyle = 'yellow';
            }
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }
};

const renderItems = () => {
    itemsElement.innerHTML = '';
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.name} - $${item.price} (Stock: ${item.stock}) <br> Demand: ${item.demand}%`;
        const incPriceButton = document.createElement('button');
        incPriceButton.textContent = '+';
        incPriceButton.onclick = () => changePrice(index, 1);
        const decPriceButton = document.createElement('button');
        decPriceButton.textContent = '-';
        decPriceButton.onclick = () => changePrice(index, -1);
        li.appendChild(incPriceButton);
        li.appendChild(decPriceButton);
        itemsElement.appendChild(li);
    });
};

const createNPC = () => {
    const npc = {
        position: { row: streetRow, col: 0 },
        state: 'walkingToShop'
    };
    npcs.push(npc);
};

const moveNPC = (npc) => {
    const { row, col } = npc.position;

    if (npc.state === 'walkingToShop') {
        // Move towards the shop
        if (row > 7) {
            npc.position.row--;
        } else if (col < shopStartCol) {
            npc.position.col++;
        } else if (col > shopEndCol) {
            npc.position.col--;
        } else if (row < cashierPosition.row) {
            npc.position.row++;
        } else if (row > cashierPosition.row) {
            npc.position.row--;
        } else if (col < cashierPosition.col) {
            npc.position.col++;
        } else if (col > cashierPosition.col) {
            npc.position.col--;
        } else {
            // NPC reached the cashier, simulate buying
            npc.state = 'buying';
            setTimeout(() => {
                attemptToBuyItem(npc);
            }, 1000);
        }
    } else if (npc.state === 'walkingBack') {
        // Move back to the street
        if (row < streetRow) {
            npc.position.row++;
        } else if (col > 0) {
            npc.position.col--;
        } else {
            // Remove NPC from game
            npcs = npcs.filter(n => n !== npc);
        }
    }
};

const moveNPCBack = (npc) => {
    npc.state = 'walkingBack';
};

const attemptToBuyItem = (npc) => {
    const item = getRandomItem();
    if (item && Math.random() * 100 < item.demand) {
        money += item.price;
        item.stock--;
        item.sold++;
        logAction(`NPC bought ${item.name} for $${item.price}`);
        updateDemand(item);
        renderItems();
        updateMoney();
        moveNPCBack(npc);
    } else {
        logAction('NPC decided not to buy anything');
        moveNPCBack(npc);
    }
};

const getRandomItem = () => {
    const availableItems = items.filter(item => item.stock > 0);
    if (availableItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        return availableItems[randomIndex];
    }
    return null;
};

const logAction = (message) => {
    const li = document.createElement('li');
    li.textContent = message;
    logElement.appendChild(li);
    logElement.scrollTop = logElement.scrollHeight;
};

const updateMoney = () => {
    moneyElement.textContent = money;
};

const updateNPCs = () => {
    npcs.forEach(npc => moveNPC(npc));
};

const restockItems = () => {
    items.forEach(item => {
        money -= item.defaultPrice * (5 - item.stock);
        item.stock = 5;
    });
    renderItems();
    updateMoney();
    logAction('All items restocked.');
};

const changePrice = (index, delta) => {
    items[index].price += delta;
    updateDemand(items[index]);
    renderItems();
};

const updateDemand = (item) => {
    const demandFactor = (item.defaultPrice / item.price) * 100;
    item.demand = Math.max(10, Math.min(200, demandFactor));
};

// Initialize the game
renderGrid();
renderItems();
updateMoney();
setInterval(() => {
    createNPC();
}, 5000);
setInterval(updateNPCs, 1000);

// Rendering loop for the canvas
const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderGrid();
    npcs.forEach(npc => {
        ctx.fillStyle = 'green';
        ctx.fillRect(npc.position.col * tileSize, npc.position.row * tileSize, tileSize, tileSize);
    });
    requestAnimationFrame(render);
};

render();
restockButton.onclick = restockItems;
