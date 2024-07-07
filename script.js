const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tileSize = 32;
const rows = 20;
const cols = 10;
const streetRow = 18;
const shopRow = 16;
const shopColStart = 2;
const shopColEnd = 7;

const itemsElement = document.getElementById('items');
const logElement = document.getElementById('log');
const moneyElement = document.getElementById('money');
const reputationElement = document.getElementById('reputation');
const townLevelElement = document.getElementById('townLevel');
const npcCountElement = document.getElementById('npcCount');
const restockButton = document.getElementById('restock');
const upgradeTownButton = document.getElementById('upgradeTown');
const npcInfoCanvas = document.getElementById('npcInfo');
const npcInfoCtx = npcInfoCanvas.getContext('2d');

const gatheringZoneCanvas = document.getElementById('gatheringZone');
const gatheringZoneCtx = gatheringZoneCanvas.getContext('2d');

const dungeonCanvas = document.getElementById('dungeon');
const dungeonCtx = dungeonCanvas.getContext('2d');

const churchCanvas = document.getElementById('church');
const churchCtx = churchCanvas.getContext('2d');

let money = 500;
let shopReputation = 100;
let townLevel = 0;
let maxNPCs = 5;
let npcCounter = 0;
let npcs = [];
let deadNPCs = [];
let dungeonActive = false;
let crystal = { hp: 100 };
let enemies = [];

const items = [
    { name: 'Potion', price: 10, defaultPrice: 10, stock: 5, sold: 0, demand: 100, effect: { hp: 100 }, equipmentType: 'potion' },
    { name: 'Sword', price: 20, defaultPrice: 20, stock: 5, sold: 0, demand: 100, effect: { attack: 10 }, equipmentType: 'weapon' },
    { name: 'Shield', price: 15, defaultPrice: 15, stock: 5, sold: 0, demand: 100, effect: { defense: 5 }, equipmentType: 'shield' }
];

const map = [
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

const renderGrid = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            ctx.fillStyle = map[row][col] === 1 ? 'gray' : 'white';
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }
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
            speed: getRandomStat(), // Adding speed stat
            equipment: { weapon: null, shield: null, potion: 0 }
        };
        npcs.push(npc);
        updateNPCCount();
    }
};

const moveNPC = (npc) => {
    if (npc.state === 'walkingToShop') {
        moveToShop(npc);
    } else if (npc.state === 'shopping') {
        moveToGatheringZone(npc);
    } else if (npc.state === 'walkingBack') {
        moveToStreet(npc);
    } else if (npc.state === 'gathering') {
        // NPC is in the Gathering Zone
    } else if (npc.state === 'dungeon') {
        moveInDungeon(npc);
    }
};

const moveToShop = (npc) => {
    if (npc.position.row > shopRow) {
        npc.position.row -= npc.speed;
    } else if (npc.position.col < shopColStart) {
        npc.position.col += npc.speed;
    } else {
        npc.state = 'shopping';
        attemptToBuyItem(npc);
    }
};

const moveToGatheringZone = (npc) => {
    npc.position = {
        x: Math.random() * gatheringZoneCanvas.width,
        y: Math.random() * gatheringZoneCanvas.height
    };
    npc.state = 'gathering';
    renderGatheringZone();
    updateNPCCount();

    // Check if there are 5 or more NPCs in the gathering zone to start the dungeon
    const gatheringNPCs = npcs.filter(n => n.state === 'gathering');
    if (gatheringNPCs.length >= 5 && !dungeonActive) {
        startDungeon();
    }
};

const moveToStreet = (npc) => {
    if (npc.position.row < streetRow) {
        npc.position.row += npc.speed;
    } else {
        npc.state = 'walkingToShop';
    }
};

const moveInDungeon = (npc) => {
    if (npc.position.x < dungeonCanvas.width - 100) {
        npc.position.x += npc.speed;
    } else if (npc.position.y < dungeonCanvas.height - 100) {
        npc.position.y += npc.speed;
    } else {
        npc.position = { x: dungeonCanvas.width - 50, y: dungeonCanvas.height - 50 };
    }
    // Handle NPCs attacking enemies and the crystal here
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

    requestAnimationFrame(renderDungeon);
};

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
            speed: getRandomStat(), // Adding speed stat
            position: { x: Math.random() * 800 + 100, y: Math.random() * 800 + 100 }
        });
    }
    renderDungeon();
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
        moveNPCToGatheringZone(npc);
    } else {
        logAction(`NPC#${npc.id} decided not to buy anything.`);
        updateReputation(-5); // Decrease shop reputation by 5% after NPC decides not to buy
        moveNPCBack(npc);
    }
};

const getRandomStat = () => Math.floor(Math.random() * 9) + 2;

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
    const newLog = document.createElement('div');
    newLog.textContent = message;
    logElement.prepend(newLog);
    if (logElement.children.length > 10) {
        logElement.removeChild(logElement.lastChild);
    }
};

const updateMoney = () => {
    moneyElement.textContent = `Money: $${money}`;
};

const updateReputation = (change) => {
    shopReputation = Math.min(100, Math.max(0, shopReputation + change));
    reputationElement.textContent = `Shop Reputation: ${shopReputation}%`;
};

const updateTownLevel = () => {
    townLevelElement.textContent = `Town Level: ${townLevel}`;
};

const updateNPCCount = () => {
    npcCountElement.textContent = `NPCs: ${npcs.length}/${maxNPCs}`;
};

const renderGatheringZone = () => {
    gatheringZoneCtx.clearRect(0, 0, gatheringZoneCanvas.width, gatheringZoneCanvas.height);
    npcs.filter(npc => npc.state === 'gathering').forEach(npc => {
        gatheringZoneCtx.fillStyle = 'green';
        gatheringZoneCtx.fillRect(npc.position.x, npc.position.y, 30, 30);
    });
    requestAnimationFrame(renderGatheringZone);
};

// Initial Setup
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
