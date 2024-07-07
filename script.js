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
const dungeonCanvas = document.createElement('canvas');
dungeonCanvas.width = 1000;
dungeonCanvas.height = 1000;
dungeonCanvas.style.width = '500px'; // Scaled size for display
dungeonCanvas.style.height = '500px';
document.body.appendChild(dungeonCanvas);
const dungeonCtx = dungeonCanvas.getContext('2d');


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
const crystal = {
    hp: 100,
    position: { x: 900, y: 900 } // Position at the end of dungeon
};

const enemies = []; // Array to store enemy objects
const enterDungeon = () => {
    // Move NPCs from gathering zone to dungeon
    npcs.filter(npc => npc.state === 'gathering').forEach(npc => {
        npc.state = 'dungeon';
        npc.position = { x: 50, y: 50 }; // Initial position inside dungeon
    });
    renderDungeon(); // Render NPCs inside the dungeon
};
const simulateDungeon = () => {
    // NPC actions inside dungeon
    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        // Simulate attacking the crystal
        if (npc.position.x < crystal.position.x) npc.position.x += npc.speed;
        if (npc.position.y < crystal.position.y) npc.position.y += npc.speed;
        if (npc.position.x >= crystal.position.x && npc.position.y >= crystal.position.y) {
            crystal.hp -= npc.attack; // NPC attacks crystal
            // Handle crystal destruction
            if (crystal.hp <= 0) {
                handleDungeonCompletion(npc);
            }
        } else {
            // NPC encounters enemies randomly
            const encounterChance = Math.random();
            if (encounterChance < 0.3) { // 30% chance to encounter an enemy
                const enemy = {
                    hp: 30,
                    attack: Math.floor(Math.random() * 7) + 4, // Random attack (4-10)
                    position: { x: Math.random() * 900 + 50, y: Math.random() * 900 + 50 },
                    speed: 1
                    
                };
                enemies.push(enemy);
            }
            // Handle NPC interactions with enemies
            enemies.forEach(enemy => {
                 if (enemy.position.x > crystal.position.x) enemy.position.x -= enemy.speed;
        if (enemy.position.y > crystal.position.y) enemy.position.y -= enemy.speed;
                if (npc.position.x >= enemy.position.x && npc.position.y >= enemy.position.y) {
                    enemy.hp -= npc.attack;
                    if (enemy.hp <= 0) {
                        npc.money += 50; // Reward NPC for killing enemy
                        enemies.splice(enemies.indexOf(enemy), 1); // Remove dead enemy
                    }
                }
            });
        }
    });
    renderDungeon();
};

const handleCollisions = () => {
    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        // Check collision with crystal
        if (npc.position.x >= crystal.position.x && npc.position.y >= crystal.position.y) {
            crystal.hp -= npc.attack;
            if (crystal.hp <= 0) {
                handleDungeonCompletion(npc);
            }
        }
        // Check collision with enemies
        enemies.forEach(enemy => {
            if (npc.position.x >= enemy.position.x && npc.position.y >= enemy.position.y) {
                enemy.hp -= npc.attack;
                if (enemy.hp <= 0) {
                    npc.money += 50; // Reward NPC for killing enemy
                    enemies.splice(enemies.indexOf(enemy), 1); // Remove dead enemy
                }
            }
        });
    });
};


const handleDungeonCompletion = (npc) => {
    // Handle dungeon completion logic
    logAction(`NPC#${npc.id} destroyed the crystal!`);
    // Clean up dungeon state
    crystal.hp = 100;
    enemies.length = 0;
    // Move NPCs back from dungeon to gathering zone
    npcs.forEach(npc => {
        if (npc.state === 'dungeon') {
            npc.state = 'gathering';
            npc.position = { x: gatheringZoneCanvas.width - 30, y: (npc.id - 1) * 40 + 10 };
        }
    });
    renderGatheringZone();
};

const renderDungeon = () => {
    dungeonCtx.clearRect(0, 0, dungeonCanvas.width, dungeonCanvas.height);
    // Render dungeon environment
    dungeonCtx.fillStyle = 'gray';
    dungeonCtx.fillRect(0, 0, dungeonCanvas.width, dungeonCanvas.height);
    // Render crystal
    dungeonCtx.fillStyle = 'purple';
    dungeonCtx.fillRect(crystal.position.x, crystal.position.y, tileSize, tileSize);
    // Render enemies
    dungeonCtx.fillStyle = 'red';
    enemies.forEach(enemy => {
        dungeonCtx.fillRect(enemy.position.x, enemy.position.y, tileSize, tileSize);
    });
    // Render NPCs
    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        dungeonCtx.fillStyle = 'green';
        dungeonCtx.fillRect(npc.position.x, npc.position.y, tileSize, tileSize);
    });
};


setInterval(() => {
    npcs.forEach(npc => {
        if (npc.state === 'gathering' && npcs.filter(n => n.state === 'gathering').length >= 5) {
            enterDungeon();
        }
    });
    if (npcs.some(npc => npc.state === 'dungeon')) {
        simulateDungeon();
    }
}, 1000);

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
            equipment: { weapon: null, shield: null },
            speed: 2
        };
        npcs.push(npc);
        updateNPCCount();
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
            // Move NPC to gathering zone after shopping
            npc.state = 'gathering';
            moveNPCToGatheringZone(npc);
        }
    } else if (npc.state === 'gathering') {
        // NPC is in gathering zone, no need to move
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
