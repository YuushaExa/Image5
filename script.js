const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const itemsElement = document.getElementById('items');
const moneyElement = document.getElementById('money');
const reputationElement = document.getElementById('reputation');
const townLevelElement = document.getElementById('townLevel');
const restockButton = document.getElementById('restock');
const upgradeTownButton = document.getElementById('upgradeTown');
const npcInfoCanvas = document.createElement('canvas'); // Create additional canvas for NPC info
npcInfoCanvas.width = 100;
npcInfoCanvas.height = 100;
document.body.appendChild(npcInfoCanvas);
const npcInfoCtx = npcInfoCanvas.getContext('2d');

let money = 100;
let shopReputation = 100;
let townLevel = 0;
let maxNPCs = 5;
let npcCounter = 1; // Counter for naming NPCs

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
    { name: 'Potion', price: 10, defaultPrice: 10, stock: 5, sold: 0, demand: 100, effect: { hp: 100 } },
    { name: 'Sword', price: 50, defaultPrice: 50, stock: 2, sold: 0, demand: 100, effect: { attack: 10 } },
    { name: 'Shield', price: 30, defaultPrice: 30, stock: 3, sold: 0, demand: 100, effect: { defense: 5 } }
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
        li.innerHTML = `${item.name} - $<span class="clickable" data-index="${index}" onclick="makeEditable(this)">${item.price}</span> (Stock: ${item.stock}) <br> Demand: ${item.demand}%`;
        itemsElement.appendChild(li);
    });
};

const createNPC = () => {
    if (npcs.length < maxNPCs && Math.random() * 100 < shopReputation) {
        const npc = {
            id: npcCounter++,
            name: `NPC#${npcCounter}`,
            position: { row: streetRow, col: 0 },
            state: 'walkingToShop',
            money: 100,
            attack: getRandomStat(),
            defense: getRandomStat(),
            hp: 100,
            equipment: { weapon: null, shield: null }
        };
        npcs.push(npc);
    }
};

const getRandomStat = () => Math.floor(Math.random() * 9) + 2;

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
    if (item && Math.random() * 100 < item.demand && npc.money >= item.price) {
        money += item.price;
        npc.money -= item.price;
        item.stock--;
        item.sold++;
        logAction(`NPC#${npc.id} bought ${item.name} for $${item.price}`);
        updateDemand(item);
        equipItem(npc, item);
        renderItems();
        updateMoney();
        moveNPCBack(npc);
    } else {
        logAction(`NPC#${npc.id} decided not to buy anything`);
        shopReputation = Math.max(10, shopReputation - 5); // Reduce reputation
        updateReputation();
        moveNPCBack(npc);
    }
};

const equipItem = (npc, item) => {
    if (item.effect.hp) {
        npc.hp += item.effect.hp;
    }
    if (item.effect.attack) {
        npc.attack += item.effect.attack;
        npc.equipment.weapon = item.name;
    }
    if (item.effect.defense) {
        npc.defense += item.effect.defense;
        npc.equipment.shield = item.name;
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

    // Limit log to the last 10 entries
    while (logElement.childNodes.length > 10) {
        logElement.removeChild(logElement.firstChild);
    }
};

const updateMoney = () => {
    moneyElement.textContent = money;
};

const updateReputation = () => {
    reputationElement.textContent = `${shopReputation}%`;
};

const updateTownLevel = () => {
    townLevelElement.textContent = townLevel;
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

const changePrice = (index, newPrice) => {
    items[index].price = newPrice;
    updateDemand(items[index]);
    renderItems();
};

const updateDemand = (item) => {
    if (item.price < 0) {
        item.demand = 1000;
    } else {
        const demandFactor = (item.defaultPrice / item.price) * 100;
        item.demand = Math.max(10, Math.min(200, demandFactor));
    }
};

const upgradeTown = () => {
    const upgradeCost = 100 + townLevel * 10;
    if (money >= upgradeCost) {
        money -= upgradeCost;
        townLevel++;
        maxNPCs = 5 + townLevel * 10;
        updateMoney();
        updateTownLevel();
        logAction(`Town upgraded to level ${townLevel}`);
    } else {
        logAction(`Not enough money to upgrade town. Need $${upgradeCost}`);
    }
};

// Initialize the game
renderGrid();
renderItems();
updateMoney();
updateReputation();
updateTownLevel();
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
upgradeTownButton.onclick = upgradeTown;

// Event listener for making item prices editable
const makeEditable1 = (element) => {
    const index = element.getAttribute('data-index');
    const item = items[index];
    element.innerHTML = `<input type="number" value="${item.price}" min="0" onblur="updatePrice(${index}, this.value)">`;
    element.querySelector('input').focus();
};

// Update item price and re-render
const updatePrice = (index, newPrice) => {
    items[index].price = parseInt(newPrice);
    updateDemand(items[index]);
    renderItems();
};

// Event listener for clicking on NPC to show info
canvas.addEventListener('click', (event) => {
    const clickedX = event.offsetX;
    const clickedY = event.offsetY;
    npcs.forEach(npc => {
        const npcX = npc.position.col * tileSize;
        const npcY = npc.position.row * tileSize;
        if (clickedX >= npcX && clickedX < npcX + tileSize &&
            clickedY >= npcY && clickedY < npcY + tileSize) {
            renderNPCInfo(npc);
        }
    });
});

// Function to render NPC information
const renderNPCInfo = (npc) => {
    npcInfoCtx.clearRect(0, 0, npcInfoCanvas.width, npcInfoCanvas.height);
    npcInfoCtx.fillStyle = 'white';
    npcInfoCtx.fillRect(0, 0, npcInfoCanvas.width, npcInfoCanvas.height);
    npcInfoCtx.fillStyle = 'black';
    npcInfoCtx.fillText(`Name: ${npc.name}`, 5, 15);
    npcInfoCtx.fillText(`Gold: ${npc.money}`, 5, 30);
    npcInfoCtx.fillText(`HP: ${npc.hp}`, 5, 45);
    npcInfoCtx.fillText(`Attack: ${npc.attack}`, 5, 60);
    npcInfoCtx.fillText(`Defense: ${npc.defense}`, 5, 75);
    if (npc.equipment.weapon) {
        npcInfoCtx.fillText(`Weapon: ${npc.equipment.weapon}`, 5, 90);
    }
    if (npc.equipment.shield) {
        npcInfoCtx.fillText(`Shield: ${npc.equipment.shield}`, 5, 105);
    }
};
