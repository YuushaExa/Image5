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
const npcInfoCanvas = document.getElementById('npcInfoCanvas');
const npcInfoCtx = npcInfoCanvas.getContext('2d');
const gatheringZoneCanvas = document.getElementById('gatheringZoneCanvas');
const gatheringZoneCtx = gatheringZoneCanvas.getContext('2d');
const dungeonCanvas = document.getElementById('dungeonCanvas');
const dungeonCtx = dungeonCanvas.getContext('2d');
const churchCanvas = document.getElementById('churchCanvas');
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
            speed: getRandomStat(),
            hp: 100,
            equipment: { weapon: null, shield: null, potion: 0 }
        };
        npcs.push(npc);
        updateNPCCount();
        logAction(`A new NPC (#${npc.id}) has entered the game.`);
    }
};

const updateNPCCount = () => {
    npcCountElement.innerText = `${npcs.length}/${maxNPCs}`;
};

const logAction = (message) => {
    const li = document.createElement('li');
    li.textContent = message;
    logElement.appendChild(li);
    logElement.scrollTop = logElement.scrollHeight;
};

const getRandomStat = () => Math.floor(Math.random() * 10) + 1;

const makeEditable = (span) => {
    const index = span.dataset.index;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = span.textContent;
    input.onblur = () => {
        items[index].price = parseFloat(input.value);
        span.textContent = input.value;
        input.replaceWith(span);
    };
    span.replaceWith(input);
    input.focus();
};

restockButton.addEventListener('click', () => {
    items.forEach(item => {
        item.stock += 5;
        logAction(`Restocked 5 units of ${item.name}.`);
    });
    renderItems();
});

upgradeTownButton.addEventListener('click', () => {
    const upgradeCost = 50 * (townLevel + 1);
    if (money >= upgradeCost) {
        money -= upgradeCost;
        townLevel++;
        maxNPCs = 5 + townLevel * 5;
        townLevelElement.innerText = townLevel;
        updateNPCCount();
        moneyElement.innerText = money;
        logAction(`Upgraded town to level ${townLevel}. Max NPCs increased to ${maxNPCs}.`);
    } else {
        logAction('Not enough money to upgrade town.');
    }
});

const npcEnterDungeon = (npc) => {
    npc.state = 'dungeon';
    logAction(`NPC#${npc.id} has entered the dungeon.`);
    if (!dungeonActive) {
        startDungeon();
    }
};

const startDungeon = () => {
    dungeonActive = true;
    crystal.hp = 100; // Reset crystal health for a new dungeon run
    enemies = Array.from({ length: 5 }, () => ({
        hp: 50,
        attack: getRandomStat(),
        defense: getRandomStat(),
        position: {
            x: Math.random() * dungeonCanvas.width,
            y: Math.random() * dungeonCanvas.height,
        },
    }));
    logAction('Dungeon adventure started!');
    renderDungeon();
};

const dungeonBattle = () => {
    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
        if (npc.hp < 30 && npc.equipment.potion > 0) {
            npc.hp = Math.min(npc.hp + 100, 100);
            npc.equipment.potion--;
        }
        enemies.forEach(enemy => {
            if (Math.abs(npc.position.x - enemy.position.x) < tileSize && Math.abs(npc.position.y - enemy.position.y) < tileSize) {
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
            }
        });
    });

    enemies = enemies.filter(enemy => enemy.hp > 0);

    if (crystal.hp > 0) {
        npcs.filter(npc => npc.state === 'dungeon').forEach(npc => {
            if (npc.position.x > dungeonCanvas.width - 100 && npc.position.y > dungeonCanvas.height - 100) {
                crystal.hp -= npc.attack;
                if (crystal.hp <= 0) {
                    logAction(`Crystal destroyed! NPCs earned 100 gold each.`);
                    npcs.filter(npc => npc.state === 'dungeon').forEach(npc => npc.money += 100);
                    endDungeon();
                }
            }
        });
    } else {
        endDungeon();
    }
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

    dungeonBattle();

    if (dungeonActive) {
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
    npcs.forEach(npc => {
        if (npc.state === 'walkingBack') {
            gatheringZoneCtx.fillStyle = 'green';
            gatheringZoneCtx.fillRect(Math.random() * gatheringZoneCanvas.width, Math.random() * gatheringZoneCanvas.height, 30, 30);
        }
    });
};

setInterval(() => {
    createNPC();
}, 5000);

const gameLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderGrid();
    renderItems();
    requestAnimationFrame(gameLoop);
};

gameLoop();
