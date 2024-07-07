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
dungeonCanvas.style.width = '500px';
dungeonCanvas.style.height = '500px';
document.body.appendChild(dungeonCanvas);
const dungeonCtx = dungeonCanvas.getContext('2d');
const churchCanvas = document.createElement('canvas');
churchCanvas.width = 150;
churchCanvas.height = 200;
document.body.appendChild(churchCanvas);
const churchCtx = churchCanvas.getContext('2d');

let money = 100;
let shopReputation = 100;
let townLevel = 0;
let maxNPCs = 5; // Initial max NPCs for town level 0
let npcCounter = 1;
let npcs = [];
let dungeonActive = false;
let crystal = { hp: 100 };
let enemies = [];
let deadNPCs = [];

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
            position: { row: streetRow, col: 0 },
            state: 'walkingToShop',
            money: 100,
            attack: getRandomStat(),
            defense: getRandomStat(),
            hp: 100,
            equipment: { weapon: null, shield: null, potion: 0 }
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
        // NPC is in the gathering zone
        // Check if there are 5 or more NPCs in the gathering zone to start the dungeon
        const gatheringNPCs = npcs.filter(n => n.state === 'gathering');
        if (gatheringNPCs.length >= 5 && !dungeonActive) {
            startDungeon();
        }
    }
};

const moveNPCToGatheringZone = (npc) => {
    npc.position = { x: Math.random() * gatheringZoneCanvas.width, y: Math.random() * gatheringZoneCanvas.height };
    updateNPCCount();
};

const attemptToBuyItem = (npc) => {
    const item = getRandomItem();
    if (item && npc.money >= item.price && Math.random() * 100 < item.demand) {
        npc.money -= item.price;
        money += item.price;
        item.stock--;
        item.sold++;
        equipItem(npc, item);
        updateMoney();
        updateDemand(item);
        logAction(`NPC#${npc.id} bought ${item.name} for $${item.price}.`);
        updateReputation(5); // Increase shop reputation by 5% after successful purchase
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
        npc.equipment.potion++;
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
    shopReputation = Math.min(100, Math.max(0, shopReputation + restorePercent));
    reputationElement.textContent = `${shopReputation}%`;
};

const updateTownLevel = () => {
    townLevelElement.textContent = townLevel;
};

const updateNPCCount = () => {
    npcCountElement.textContent = `${npcs.filter(n => n.state !== 'dead').length}/${maxNPCs}`;
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

// Dungeon logic
const startDungeon = () => {
    dungeonActive = true;
    crystal.hp = 100;
    enemies = [];
    const gatheringNPCs = npcs.filter(n => n.state === 'gathering');
    gatheringNPCs.forEach(npc => {
        npc.state = 'dungeon';
        npc.position = { x: 50, y: 50 };
    });
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
        enemies.push({
            hp: 30,
            attack: getRandomStat(),
            defense: getRandomStat(),
            position: { x: Math.random() * 800 + 100, y: Math.random() * 800 + 100 }
        });
    }
    renderDungeon();
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

const dungeonBattle = (aliveNPCs) => {
    aliveNPCs.forEach(npc => {
        if (npc.hp < 30 && npc.equipment.potion > 0) {
            npc.hp = Math.min(npc.hp + 100, 100);
            npc.equipment.potion--;
        }
        enemies.forEach(enemy => {
            if (npc.attack > enemy.defense) {
                enemy.hp -= npc.attack - enemy.defense;
                if (enemy.hp <= 0) {
                    npc.money += 50;
                    logAction(`NPC#${npc.id} killed an enemy and earned 50 gold.`);
                }
            }
            if (enemy.attack > npc.defense) {
                npc.hp -= enemy.attack - npc.defense;
                if (npc.hp <= 0) {
                    npc.state = 'dead';
                    deadNPCs.push(npc);
                    logAction(`NPC#${npc.id} died in the dungeon.`);
                }
            }
        });
    });

    enemies = enemies.filter(enemy => enemy.hp > 0);

    if (crystal.hp > 0 && aliveNPCs.some(npc => npc.position.x > dungeonCanvas.width - 100 && npc.position.y > dungeonCanvas.height - 100)) {
        crystal.hp -= aliveNPCs.reduce((total, npc) => total + npc.attack, 0);
        if (crystal.hp <= 0) {
            logAction(`Crystal destroyed! NPCs earned 100 gold each.`);
            aliveNPCs.forEach(npc => npc.money += 100);
            endDungeon();
        }
    } else if (enemies.length === 0) {
        logAction(`All enemies defeated! NPCs earned 100 gold each.`);
        aliveNPCs.forEach(npc => npc.money += 100);
        endDungeon();
    } else {
        requestAnimationFrame(renderDungeon);
    }
};

const endDungeon = () => {
    dungeonActive = false;
    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        npc.state = 'walkingBack';
    });
    renderGatheringZone();
};

const renderGatheringZone = () => {
    gatheringZoneCtx.clearRect(0, 0, gatheringZoneCanvas.width, gatheringZoneCanvas.height);
    npcs.filter(npc => npc.state === 'gathering').forEach(npc => {
        gatheringZoneCtx.fillStyle = 'green';
        gatheringZoneCtx.fillRect(npc.position.x, npc.position.y, tileSize, tileSize);
    });
};

const resurrectNPCs = () => {
    deadNPCs.forEach(npc => {
        setTimeout(() => {
            npc.state = 'walkingToShop';
            deadNPCs = deadNPCs.filter(n => n !== npc);
        }, 60000);
    });
    renderChurch();
};

const renderChurch = () => {
    churchCtx.clearRect(0, 0, churchCanvas.width, churchCanvas.height);
    deadNPCs.forEach((npc, index) => {
        churchCtx.fillStyle = 'gray';
        churchCtx.fillRect(10, 30 * index, tileSize, tileSize);
        churchCtx.fillStyle = 'black';
        churchCtx.fillText(npc.name, 10 + tileSize, 30 * index + tileSize / 2);
    });
};

// Initialize the game
renderGrid();
renderItems();
updateMoney();
updateReputation();
updateTownLevel();
updateNPCCount();

setInterval(createNPC, 5000); // Create an NPC every 5 seconds

setInterval(() => {
    npcs.forEach(moveNPC);
    renderGrid();
    npcs.forEach(npc => {
        if (npc.state === 'walkingToShop' || npc.state === 'walkingBack') {
            ctx.fillStyle = 'green';
            ctx.fillRect(npc.position.col * tileSize, npc.position.row * tileSize, tileSize, tileSize);
        }
    });
}, 1000);

// Event Listeners
restockButton.addEventListener('click', restockItems);
upgradeTownButton.addEventListener('click', upgradeTown);
npcInfoCanvas.addEventListener('click', showNPCInfo);

function makeEditable(element) {
    const index = element.getAttribute('data-index');
    const item = items[index];
    element.innerHTML = `<input type="number" value="${item.price}" onblur="updateText(this, ${index})" />`;
    const input = element.firstChild;
    input.focus();
    input.setSelectionRange(0, input.value.length);
}

function updateText(input, index) {
    const newPrice = parseInt(input.value);
    changePrice(index, newPrice);
}

// Render NPC Info
function showNPCInfo(event) {
    const x = event.clientX - npcInfoCanvas.offsetLeft;
    const y = event.clientY - npcInfoCanvas.offsetTop;
    const npc = npcs.find(npc => {
        const npcX = npc.position.x;
        const npcY = npc.position.y;
        return x > npcX && x < npcX + tileSize && y > npcY && y < npcY + tileSize;
    });
    if (npc) {
        renderNPCInfo(npc);
    }
}

function renderNPCInfo(npc) {
    npcInfoCtx.clearRect(0, 0, npcInfoCanvas.width, npcInfoCanvas.height);
    npcInfoCtx.fillStyle = 'black';
    npcInfoCtx.fillText(`Name: ${npc.name}`, 10, 20);
    npcInfoCtx.fillText(`Attack: ${npc.attack}`, 10, 40);
    npcInfoCtx.fillText(`Defense: ${npc.defense}`, 10, 60);
    npcInfoCtx.fillText(`HP: ${npc.hp}`, 10, 80);
    npcInfoCtx.fillText(`Gold: ${npc.money}`, 10, 100);
    npcInfoCtx.fillText(`Equipment:`, 10, 120);
    npcInfoCtx.fillText(`Weapon: ${npc.equipment.weapon || 'None'}`, 10, 140);
    npcInfoCtx.fillText(`Shield: ${npc.equipment.shield || 'None'}`, 10, 160);
    npcInfoCtx.fillText(`Potions: ${npc.equipment.potion}`, 10, 180);
}
