document.addEventListener('DOMContentLoaded', function() {
    const canvas = new fabric.Canvas('canvas', {
        width: 800,
        height: 600
    });

    const fileInput = document.getElementById('file-input');
    const cropBtn = document.getElementById('crop-btn');
    const rotateBtn = document.getElementById('rotate-btn');
    const healBtn = document.getElementById('heal-btn');
    const downloadBtn = document.getElementById('download-btn');

    let uploadedImage = null;
    let healingMode = false;
    let cursorSize = 30; // Adjust as needed
    let searchRadius = 50; // Adjust as needed
    let blendingIntensity = 0.5; // Adjust as needed
    let affectedArea = 0.8; // Adjust as needed

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(f) {
                const data = f.target.result;
                fabric.Image.fromURL(data, function(img) {
                    canvas.clear();
                    uploadedImage = img;
                    img.set({
                        left: 100,
                        top: 100,
                        angle: 0,
                        padding: 10,
                        cornersize: 10,
                        hasRotatingPoint: true
                    });
                    canvas.add(img).setActiveObject(img);
                });
            };
            reader.readAsDataURL(file);
        }
    });

    cropBtn.addEventListener('click', function() {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'image') {
            const cropped = new fabric.Image(activeObject.getElement(), {
                left: activeObject.left,
                top: activeObject.top,
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                angle: activeObject.angle
            });
            canvas.remove(activeObject);
            canvas.add(cropped);
            canvas.setActiveObject(cropped);
        }
    });

    rotateBtn.addEventListener('click', function() {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'image') {
            activeObject.rotate((activeObject.angle + 90) % 360);
            canvas.renderAll();
        }
    });

    healBtn.addEventListener('click', function() {
        healingMode = !healingMode;
        if (healingMode) {
            healBtn.textContent = 'Cancel Healing';
            canvas.on('mouse:down', healImage);
        } else {
            healBtn.textContent = 'Heal';
            canvas.off('mouse:down', healImage);
        }
    });

    function healImage(event) {
        const pointer = canvas.getPointer(event.e);
        if (uploadedImage && uploadedImage.getElement()) {
            const context = uploadedImage.getElement().getContext('2d');
            inpaintSpot(pointer.x - uploadedImage.left, pointer.y - uploadedImage.top, context);
            uploadedImage.setElement(uploadedImage.getElement());
            canvas.renderAll();
        }
    }

    function inpaintSpot(x, y, context) {
        const radius = cursorSize / 2;
        const imageData = context.getImageData(x - radius, y - radius, radius * 2, radius * 2);
        const data = imageData.data;

        const patchSize = radius * 2;
        const similarPatch = findBestPatch(x, y, patchSize, context);
        if (similarPatch) {
            advancedBlendPatches(data, similarPatch.data, radius, blendingIntensity, affectedArea);
            context.putImageData(imageData, x - radius, y - radius);
        }
    }

    function findBestPatch(x, y, size, context) {
        let bestPatch = null;
        let bestScore = Infinity;

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                if (x + dx < 0 || y + dy < 0 || x + dx + size >= canvas.width || y + dy + size >= canvas.height) {
                    continue;
                }

                const patchData = extractPatchData(x + dx, y + dy, size, context);
                const score = computePatchScore(patchData);
                if (score < bestScore) {
                    bestScore = score;
                    bestPatch = { x: x + dx, y: y + dy, data: patchData };
                }
            }
        }

        return bestPatch;
    }

    function extractPatchData(x, y, size, context) {
        const startX = Math.max(0, x);
        const startY = Math.max(0, y);
        const endX = Math.min(canvas.width, x + size);
        const endY = Math.min(canvas.height, y + size);
        return context.getImageData(startX, startY, endX - startX, endY - startY).data;
    }

    function computePatchScore(data) {
        let r = 0, g = 0, b = 0, count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        r /= count;
        g /= count;
        b /= count;

        let score = 0;
        for (let i = 0; i < data.length; i += 4) {
            score += Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
        }

        return score;
    }

    function advancedBlendPatches(sourceData, targetData, radius, intensity, affectedArea) {
        const length = sourceData.length;
        const sigma = radius / 3;
        const gauss = (d) => Math.exp(-(d * d) / (2 * sigma * sigma));
        const affectRadius = radius * affectedArea;

        for (let i = 0; i < length; i += 4) {
            const dx = (i / 4) % (radius * 2) - radius;
            const dy = Math.floor((i / 4) / (radius * 2)) - radius;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < affectRadius) {
                const weight = gauss(dist) * intensity;
                sourceData[i] = weight * targetData[i] + (1 - weight) * sourceData[i];
                sourceData[i + 1] = weight * targetData[i + 1] + (1 - weight) * sourceData[i + 1];
                sourceData[i + 2] = weight * targetData[i + 2] + (1 - weight) * sourceData[i + 2];
            }
        }
    }

    downloadBtn.addEventListener('click', function() {
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'edited-image.png';
        link.click();
    });
});
