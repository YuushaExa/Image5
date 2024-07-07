const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const itemsElement = document.getElementById('items');
const moneyElement = document.getElementById('money');
const reputationElement = document.getElementById('reputation');
const townLevelElement = document.getElementById('townLevel');
const npcCountElement = document.getElementById('npcCount');
const restockButton = document.getElementById('restock');
const upgradeTownButton = document.getElementById('upgradeTown');
const npcInfoCanvas = document.createElement('canvas');
npcInfoCanvas.width = 100;
npcInfoCanvas.height = 100;
document.body.appendChild(npcInfoCanvas);
const npcInfoCtx = npcInfoCanvas.getContext('2d');
const gatheringZoneCanvas = document.createElement('canvas');
gatheringZoneCanvas.width = 150;
gatheringZoneCanvas.height = 200;
document.body.appendChild(gatheringZoneCanvas);
const gatheringZoneCtx = gatheringZoneCanvas.getContext('2d');

let money = 100;
let shopReputation = 100;
let townLevel = 0;
let maxNPCs = 5; // Initial max NPCs for town level 0
let npcCounter = 1;
let npcs = [];

const tileSize = 30;
const rows = 10;
const cols = 20;
const streetRow = 9;
const shopStartCol = 10;
const shopEndCol = 14;
const cashierPosition = { row: 5, col: 12 };

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
            position: { x: 0, y: streetRow * tileSize },
            state: 'walkingToShop',
            money: 100,
            attack: getRandomStat(),
            defense: getRandomStat(),
            hp: 100,
            equipment: { weapon: null, shield: null },
            speed: 1 + Math.random() * 2 // Adjust speed range as needed
        };
        npcs.push(npc);
    }
};

const createEnemy = () => {
    enemies.push({
        hp: 30,
        attack: getRandomStat(),
        defense: getRandomStat(),
        position: { x: Math.random() * 800 + 100, y: Math.random() * 800 + 100 },
        speed: 1 + Math.random() * 2 // Adjust speed range as needed
    });
};


const getRandomStat = () => Math.floor(Math.random() * 9) + 2;

const moveNPCs = () => {
    npcs.forEach(npc => {
        if (npc.state === 'walkingToShop') {
            npc.position.x += npc.speed;
            if (npc.position.x >= shopCol * tileSize) {
                npc.state = 'shopping';
                attemptToBuyItem(npc);
            }
        } else if (npc.state === 'walkingBack') {
            npc.position.x -= npc.speed;
            if (npc.position.x <= 0) {
                npc.state = 'gathering';
                moveNPCToGatheringZone(npc);
            }
        }
    });
};

const renderDungeon = () => {
    dungeonCtx.clearRect(0, 0, dungeonCanvas.width, dungeonCanvas.height);
    dungeonCtx.fillStyle = 'purple';
    dungeonCtx.fillRect(dungeonCanvas.width - 60, dungeonCanvas.height - 60, 50, 50);

    enemies.forEach(enemy => {
        dungeonCtx.fillStyle = 'red';
        dungeonCtx.fillRect(enemy.position.x, enemy.position.y, 30, 30);
    });

    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        dungeonCtx.fillStyle = 'green';
        dungeonCtx.fillRect(npc.position.x, npc.position.y, 30, 30);
    });

    // Check if all NPCs have reached the crystal or if there are no enemies left
    const aliveNPCs = npcs.filter(npc => npc.state === 'dungeon');
    if (aliveNPCs.every(npc => npc.position.x > dungeonCanvas.width - 100 && npc.position.y > dungeonCanvas.height - 100) || enemies.length === 0) {
        dungeonBattle(aliveNPCs);
    } else {
        requestAnimationFrame(renderDungeon);
    }
};


const moveNPCToGatheringZone = (npc) => {
    const gatheringZonePosition = {
        x: gatheringZoneCanvas.width - 30,
        y: (npc.id - 1) * 40 + 10
    };

    npc.position = gatheringZonePosition;
    renderNPCInGatheringZone(npc);
};

const renderNPCInGatheringZone = (npc) => {
    gatheringZoneCtx.fillStyle = 'green';
    gatheringZoneCtx.fillRect(npc.position.x, npc.position.y, tileSize, tileSize);
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
        updateReputation(5); // Restore shop reputation by 5% after successful purchase
        moveNPCBack(npc);
    } else {
        logAction(`NPC#${npc.id} decided not to buy anything.`);
        updateReputation(-5); // Decrease shop reputation by 5% after NPC decides not to buy
        moveNPCBack(npc);
    }
};

const moveNPCBack = (npc) => {
    npc.state = 'walkingBack';
    npc.position = { x: Math.random() * gatheringZoneCanvas.width, y: Math.random() * gatheringZoneCanvas.height };
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
    return availableItems.length > 0 ? availableItems[Math.floor(Math.random() * availableItems.length)] : null;
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

const updateReputation = (restorePercent = 0) => {
    shopReputation = Math.min(100, shopReputation + restorePercent);
    reputationElement.textContent = `${shopReputation}%`;
};

const updateTownLevel = () => {
    townLevelElement.textContent = townLevel;
};

const updateNPCCount = () => {
    npcCountElement.textContent = `${npcs.length}/${maxNPCs}`;
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
        maxNPCs = 5 + townLevel * 10; // Update maxNPCs based on town level
        updateMoney();
        updateTownLevel();
        updateNPCCount(); // Update NPC count display
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
updateNPCCount(); // Display initial NPC count
setInterval(createNPC, 5000);
setInterval(() => {
    npcs.forEach(npc => moveNPC(npc));
    renderGatheringZone(); // Render NPCs in gathering zone
}, 1000);

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

const renderGatheringZone = () => {
    gatheringZoneCtx.clearRect(0, 0, gatheringZoneCanvas.width, gatheringZoneCanvas.height);
    npcs.filter(npc => npc.state === 'gathering').forEach(npc => {
        gatheringZoneCtx.fillStyle = 'green';
        gatheringZoneCtx.fillRect(npc.position.x, npc.position.y, tileSize, tileSize);
    });
};

render();
restockButton.onclick = restockItems;
upgradeTownButton.onclick = upgradeTown;

// Event listener for making item prices editable
const makeEditable = (element) => {
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
