const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');
const selectionBox = document.getElementById('selection-box');
const resizeHandle = document.getElementById('resize-handle');
const rotateHandle = document.getElementById('rotate-handle');

let images = [];
let selectedImageIndex = null;
let isDragging = false;
let isResizing = false;
let isRotating = false;
let startX = 0;
let startY = 0;

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const files = e.target.files;
    for (let file of files) {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            images.push({
                img: image,
                x: 100,
                y: 100,
                width: 100,
                height: 100,
                angle: 0
            });
            draw();
        };
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach((image, index) => {
        ctx.save();
        ctx.translate(image.x + image.width / 2, image.y + image.height / 2);
        ctx.rotate(image.angle * Math.PI / 180);
        ctx.drawImage(image.img, -image.width / 2, -image.height / 2, image.width, image.height);
        ctx.restore();
        if (index === selectedImageIndex) {
            updateHandles(image);
        }
    });
}

function updateHandles(image) {
    selectionBox.style.left = `${image.x}px`;
    selectionBox.style.top = `${image.y}px`;
    selectionBox.style.width = `${image.width}px`;
    selectionBox.style.height = `${image.height}px`;
    selectionBox.style.display = 'block';

    resizeHandle.style.left = `${image.x + image.width - 5}px`;
    resizeHandle.style.top = `${image.y + image.height - 5}px`;
    resizeHandle.style.display = 'block';

    rotateHandle.style.left = `${image.x + image.width / 2 - 5}px`;
    rotateHandle.style.top = `${image.y - 20}px`;
    rotateHandle.style.display = 'block';
}

function handleMouseDownOrTouchStart(e) {
    e.preventDefault();
    const mouseX = e.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top;

    for (let i = images.length - 1; i >= 0; i--) {
        if (isInSelection(images[i], mouseX, mouseY)) {
            selectedImageIndex = i;
            startX = mouseX - images[i].x;
            startY = mouseY - images[i].y;
            if (isInResizeHandle(images[i], mouseX, mouseY)) {
                isResizing = true;
            } else if (isInRotateHandle(images[i], mouseX, mouseY)) {
                isRotating = true;
            } else {
                isDragging = true;
            }
            draw();
            return;
        }
    }
    selectedImageIndex = null;
    draw();
}

function handleMouseMoveOrTouchMove(e) {
    e.preventDefault();
    const mouseX = e.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top;

    if (selectedImageIndex !== null) {
        const selectedImage = images[selectedImageIndex];
        if (isDragging) {
            selectedImage.x = mouseX - startX;
            selectedImage.y = mouseY - startY;
            draw();
        } else if (isResizing) {
            selectedImage.width = mouseX - selectedImage.x;
            selectedImage.height = mouseY - selectedImage.y;
            draw();
        } else if (isRotating) {
            const centerX = selectedImage.x + selectedImage.width / 2;
            const centerY = selectedImage.y + selectedImage.height / 2;
            const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
            selectedImage.angle = angle * 180 / Math.PI;
            draw();
        }
    }
}

function handleMouseUpOrTouchEnd() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
}

function isInSelection(image, x, y) {
    ctx.save();
    ctx.translate(image.x + image.width / 2, image.y + image.height / 2);
    ctx.rotate(image.angle * Math.PI / 180);
    ctx.translate(-image.x - image.width / 2, -image.y - image.height / 2);
    const isIn = ctx.isPointInPath(
        new Path2D(
            `M${image.x},${image.y} h${image.width} v${image.height} h${-image.width} Z`
        ),
        x, y
    );
    ctx.restore();
    return isIn;
}

function isInResizeHandle(image, x, y) {
    const handleX = image.x + image.width - 5;
    const handleY = image.y + image.height - 5;
    return x > handleX && x < handleX + 10 && y > handleY && y < handleY + 10;
}

function isInRotateHandle(image, x, y) {
    const handleX = image.x + image.width / 2 - 5;
    const handleY = image.y - 20;
    return x > handleX && x < handleX + 10 && y > handleY && y < handleY + 10;
}

// Event listeners for mouse
canvas.addEventListener('mousedown', handleMouseDownOrTouchStart);
document.addEventListener('mousemove', handleMouseMoveOrTouchMove);
document.addEventListener('mouseup', handleMouseUpOrTouchEnd);

// Event listeners for touch
canvas.addEventListener('touchstart', handleMouseDownOrTouchStart);
document.addEventListener('touchmove', handleMouseMoveOrTouchMove);
document.addEventListener('touchend', handleMouseUpOrTouchEnd);
 
