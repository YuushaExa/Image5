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
    let sourcePoint = null;

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
            canvas.on('mouse:down', selectSourcePoint);
        } else {
            healBtn.textContent = 'Heal';
            canvas.off('mouse:down', selectSourcePoint);
            canvas.off('mouse:down', applyHealing);
            sourcePoint = null;
        }
    });

    function selectSourcePoint(event) {
        const pointer = canvas.getPointer(event.e);
        sourcePoint = {
            x: pointer.x,
            y: pointer.y
        };
        canvas.off('mouse:down', selectSourcePoint);
        canvas.on('mouse:down', applyHealing);
    }

    function applyHealing(event) {
        if (!sourcePoint) return;

        const pointer = canvas.getPointer(event.e);
        const targetPoint = {
            x: pointer.x,
            y: pointer.y
        };

        const width = 50; // width of the clone stamp
        const height = 50; // height of the clone stamp

        const img = uploadedImage.getElement();
        const canvasElement = document.createElement('canvas');
        const context = canvasElement.getContext('2d');

        canvasElement.width = width;
        canvasElement.height = height;

        context.drawImage(
            img,
            sourcePoint.x - uploadedImage.left,
            sourcePoint.y - uploadedImage.top,
            width, height,
            0, 0,
            width, height
        );

        const imageData = canvasElement.toDataURL();

        fabric.Image.fromURL(imageData, function(cloneImg) {
            cloneImg.set({
                left: targetPoint.x,
                top: targetPoint.y
            });
            canvas.add(cloneImg);
            canvas.renderAll();
        });

        healingMode = false;
        healBtn.textContent = 'Heal';
        canvas.off('mouse:down', applyHealing);
        sourcePoint = null;
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
