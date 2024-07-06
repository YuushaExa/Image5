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
            position: { row: streetRow, col: 0 },
            state: 'walkingToShop',
            money: 100,
            attack: getRandomStat(),
            defense: getRandomStat(),
            hp: 100,
            equipment: { weapon: null, shield: null }
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
        updateReputation(-5); // Decrease shop reputation by 5% after NPC decides not
