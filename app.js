document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('brightness').addEventListener('input', updateFilters);
document.getElementById('contrast').addEventListener('input', updateFilters);
document.getElementById('saturation').addEventListener('input', updateFilters);
document.getElementById('hue').addEventListener('input', updateFilters);
document.getElementById('filter').addEventListener('change', updateFilters);
document.getElementById('move').addEventListener('click', toggleMoveMode);

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
const frame = document.getElementById('frame');
const handles = document.querySelectorAll('.handle');

let imageTexture;
let program;
let brightness = 0;
let contrast = 1;
let saturation = 1;
let hue = 0;
let filter = 'none';

let isMoveMode = false;
let isDragging = false;
let isResizing = false;
let isRotating = false;
let initialMousePos = { x: 0, y: 0 };
let objectPos = { x: 0, y: 0 };
let objectSize = { width: 1, height: 1 };
let objectAngle = 0;
let startDistance = 0;
let startAngle = 0;

const kernels = {
    none: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0
    ],
    sharpen: [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ],
    blur: [
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9
    ],
    'edge-detect': [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
    ],
    emboss: [
        -2, -1, 0,
        -1, 1, 1,
        0, 1, 2
    ]
};

function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            objectSize.width = img.width;
            objectSize.height = img.height;
            document.getElementById('object-width').textContent = img.width;
            document.getElementById('object-height').textContent = img.height;
            document.getElementById('object-angle').textContent = '0'; // Assume 0 for simplicity
            setupWebGL(img);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function setupWebGL(image) {
    imageTexture = createTexture(gl, image);
    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (program) {
        gl.useProgram(program);
        setupBuffers();
        render();
    } else {
        console.error('Failed to create WebGL program.');
    }
}

function createTexture(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip the image's Y axis

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters for NPOT textures
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Error compiling ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function setupBuffers() {
    const positions = new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1,  1,  1, -1,  1, 1
    ]);

    const texCoords = new Float32Array([
        0, 0,  1, 0,  0, 1,
        0, 1,  1, 0,  1, 1
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
}

function updateFilters() {
    brightness = parseFloat(document.getElementById('brightness').value);
    contrast = parseFloat(document.getElementById('contrast').value);
    saturation = parseFloat(document.getElementById('saturation').value);
    hue = parseFloat(document.getElementById('hue').value);
    filter = document.getElementById('filter').value;
    render();
}

function render() {
    if (!program) {
        console.error('No WebGL program available.');
        return;
    }

    gl.useProgram(program);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);

    gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), brightness);
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), saturation);
    gl.uniform1f(gl.getUniformLocation(program, 'u_hue'), hue);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_kernel'), false, new Float32Array(kernels[filter]));
    gl.uniform2f(gl.getUniformLocation(program, 'u_textureSize'), canvas.width, canvas.height);

    // Transformations
    const angleInRadians = (objectAngle * Math.PI) / 180;
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);
    const transformMatrix = new Float32Array([
        objectSize.width * cos / canvas.width, objectSize.width * sin / canvas.height, 0,
        -objectSize.height * sin / canvas.width, objectSize.height * cos / canvas.height, 0,
        objectPos.x, objectPos.y, 1
    ]);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_transform'), false, transformMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function toggleMoveMode() {
    isMoveMode = !isMoveMode;
    if (isMoveMode) {
        updateFrame();
    } else {
        frame.style.display = 'none';
    }
}

function updateFrame() {
    frame.style.display = 'block';
    const frameSize = 100;
    const centerX = canvas.width / 2 + objectPos.x * canvas.width;
    const centerY = canvas.height / 2 - objectPos.y * canvas.height;
    frame.style.width = `${frameSize}px`;
    frame.style.height = `${frameSize}px`;
    frame.style.left = `${centerX - frameSize / 2}px`;
    frame.style.top = `${centerY - frameSize / 2}px`;
    frame.style.transform = `rotate(${objectAngle}deg)`;
}

frame.addEventListener('mousedown', (e) => {
    if (isMoveMode) {
        initialMousePos.x = e.clientX;
        initialMousePos.y = e.clientY;
        isDragging = true;
    }
});

frame.addEventListener('mousemove', (e) => {
    if (isMoveMode && isDragging) {
        const dx = e.clientX - initialMousePos.x;
        const dy = e.clientY - initialMousePos.y;
        objectPos.x += dx / canvas.width;
        objectPos.y -= dy / canvas.height;
        initialMousePos.x = e.clientX;
        initialMousePos.y = e.clientY;
        render();
        updateFrame();
    }
});

frame.addEventListener('mouseup', () => {
    isDragging = false;
});

frame.addEventListener('touchstart', (e) => {
    if (isMoveMode) {
        const touch = e.touches[0];
        initialMousePos.x = touch.clientX;
        initialMousePos.y = touch.clientY;
        isDragging = true;
    }
});

frame.addEventListener('touchmove', (e) => {
    if (isMoveMode && isDragging) {
        const touch = e.touches[0];
        const dx = touch.clientX - initialMousePos.x;
        const dy = touch.clientY - initialMousePos.y;
        objectPos.x += dx / canvas.width;
        objectPos.y -= dy / canvas.height;
        initialMousePos.x = touch.clientX;
        initialMousePos.y = touch.clientY;
        render();
        updateFrame();
    }
});

frame.addEventListener('touchend', () => {
    isDragging = false;
});

handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        initialMousePos.x = e.clientX;
        initialMousePos.y = e.clientY;
        if (handle.classList.contains('rotate')) {
            isRotating = true;
            startAngle = objectAngle;
        } else {
            isResizing = true;
            startDistance = Math.hypot(initialMousePos.x - canvas.width / 2, initialMousePos.y - canvas.height / 2);
        }
    });

    handle.addEventListener('mousemove', (e) => {
        if (isResizing || isRotating) {
            const dx = e.clientX - initialMousePos.x;
            const dy = e.clientY - initialMousePos.y;

            if (isResizing) {
                const currentDistance = Math.hypot(e.clientX - canvas.width / 2, e.clientY - canvas.height / 2);
                const scale = currentDistance / startDistance;
                objectSize.width *= scale;
                objectSize.height *= scale;
                startDistance = currentDistance;
            }

            if (isRotating) {
                const angle = Math.atan2(dy, dx);
                objectAngle = startAngle + (angle * 180) / Math.PI;
            }

            render();
            updateFrame();
        }
    });

    handle.addEventListener('mouseup', () => {
        isResizing = false;
        isRotating = false;
    });

    handle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        initialMousePos.x = touch.clientX;
        initialMousePos.y = touch.clientY;
        if (handle.classList.contains('rotate')) {
            isRotating = true;
            startAngle = objectAngle;
        } else {
            isResizing = true;
            startDistance = Math.hypot(initialMousePos.x - canvas.width / 2, initialMousePos.y - canvas.height / 2);
        }
    });

    handle.addEventListener('touchmove', (e) => {
        if (isResizing || isRotating) {
            const touch = e.touches[0];
            const dx = touch.clientX - initialMousePos.x;
            const dy = touch.clientY - initialMousePos.y;

            if (isResizing) {
                const currentDistance = Math.hypot(touch.clientX - canvas.width / 2, touch.clientY - canvas.height / 2);
                const scale = currentDistance / startDistance;
                objectSize.width *= scale;
                objectSize.height *= scale;
                startDistance = currentDistance;
            }

            if (isRotating) {
                const angle = Math.atan2(dy, dx);
                objectAngle = startAngle + (angle * 180) / Math.PI;
            }

            render();
            updateFrame();
        }
    });

    handle.addEventListener('touchend', () => {
        isResizing = false;
        isRotating = false;
    });
});

const vertexShaderSource = `
    attribute vec4 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    uniform mat3 u_transform;
    void main() {
        gl_Position = vec4((u_transform * vec3(a_position.xy, 1)).xy, 0, 1);
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform float u_saturation;
    uniform float u_hue;
    uniform mat3 u_kernel;
    uniform vec2 u_textureSize;
    varying vec2 v_texCoord;

    vec3 adjustHue(vec3 color, float hue) {
        float angle = hue * 3.14159265 / 180.0;
        float cosA = cos(angle);
        float sinA = sin(angle);
        mat3 hueRotation = mat3(
            vec3(0.299, 0.587, 0.114) + vec3(0.701, -0.587, -0.114) * cosA + vec3(0.168, -0.331, 1.273) * sinA,
            vec3(0.299, 0.587, 0.114) + vec3(-0.299, 0.413, -0.114) * cosA + vec3(0.328, 0.259, -1.328) * sinA,
            vec3(0.299, 0.587, 0.114) + vec3(-0.3, -0.588, 0.886) * cosA + vec3(-1.496, 1.549, 1.283) * sinA
        );
        return color * hueRotation;
    }

    void main() {
        vec2 onePixel = vec2(1.0) / u_textureSize;
        vec4 color = vec4(0.0);
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                vec2 offset = vec2(float(i - 1), float(j - 1)) * onePixel;
                color += texture2D(u_image, v_texCoord + offset) * u_kernel[i][j];
            }
        }
        color.rgb += u_brightness;
        color.rgb = ((color.rgb - 0.5) * max(u_contrast, 0.0)) + 0.5;
        float grey = dot(color.rgb, vec3(0.3, 0.59, 0.11));
        color.rgb = mix(vec3(grey), color.rgb, u_saturation);
        color.rgb = adjustHue(color.rgb, u_hue);
        gl_FragColor = color;
    }
`;

render();


const healToolButton = document.getElementById('healToolButton');
const cursorSizeInput = document.getElementById('cursorSize');
const blendingIntensityInput = document.getElementById('blendingIntensity');
const searchRadiusInput = document.getElementById('searchRadius');
const affectedAreaInput = document.getElementById('affectedArea');
const context = canvas.getContext('2d');
const cursor = document.getElementById('cursor');

let image = new Image();
let usingHealTool = false;
let cursorSize = parseInt(cursorSizeInput.value, 10);
let blendingIntensity = parseFloat(blendingIntensityInput.value);
let searchRadius = parseInt(searchRadiusInput.value, 10);
let affectedArea = parseFloat(affectedAreaInput.value);
let canvasData = null;

document.getElementById('upload').addEventListener('change', handleImageUpload);
healToolButton.addEventListener('click', () => {
    usingHealTool = !usingHealTool;
    cursor.style.display = usingHealTool ? 'block' : 'none';
});

cursorSizeInput.addEventListener('input', () => {
    cursorSize = parseInt(cursorSizeInput.value, 10);
    cursor.style.width = cursor.style.height = `${cursorSize}px`;
});

blendingIntensityInput.addEventListener('input', () => {
    blendingIntensity = parseFloat(blendingIntensityInput.value);
});

searchRadiusInput.addEventListener('input', () => {
    searchRadius = parseInt(searchRadiusInput.value, 10);
});

affectedAreaInput.addEventListener('input', () => {
    affectedArea = parseFloat(affectedAreaInput.value);
});

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('click', handleCanvasClick);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            image.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0);
                canvasData = context.getImageData(0, 0, canvas.width, canvas.height);
            }
            image.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

function handleMouseMove(event) {
    if (usingHealTool) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        cursor.style.left = `${event.clientX - cursorSize / 2}px`;
        cursor.style.top = `${event.clientY - cursorSize / 2}px`;
    }
}

function handleCanvasClick(event) {
    if (usingHealTool) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        inpaintSpot(x, y);
    }
}

function inpaintSpot(x, y) {
    const radius = cursorSize / 2;
    const imageData = context.getImageData(x - radius, y - radius, radius * 2, radius * 2);
    const data = imageData.data;

    const patchSize = radius * 2;
    const similarPatch = findBestPatch(x, y, patchSize);
    if (similarPatch) {
        advancedBlendPatches(data, similarPatch.data, radius, blendingIntensity, affectedArea);
        context.putImageData(imageData, x - radius, y - radius);
    }
}

function findBestPatch(x, y, size) {
    let bestPatch = null;
    let bestScore = Infinity;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            if (x + dx < 0 || y + dy < 0 || x + dx + size >= canvas.width || y + dy + size >= canvas.height) {
                continue;
            }

            const patchData = extractPatchData(x + dx, y + dy, size);
            const score = computePatchScore(patchData);
            if (score < bestScore) {
                bestScore = score;
                bestPatch = { x: x + dx, y: y + dy, data: patchData };
            }
        }
    }

    return bestPatch;
}

function extractPatchData(x, y, size) {
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

function contentAwareFill(sourceData, targetData, radius, intensity) {
    const length = sourceData.length;
    const size = Math.sqrt(length / 4);

    for (let i = 0; i < length; i += 4) {
        const dx = (i / 4) % (radius * 2) - radius;
        const dy = Math.floor((i / 4) / (radius * 2)) - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
            const index = (dy + radius) * (radius * 2) + (dx + radius);
            const sourceIndex = 4 * index;
            const targetIndex = 4 * index;

            const weight = Math.exp(-dist * dist / (2 * radius * radius)) * intensity;

            sourceData[sourceIndex] = weight * targetData[targetIndex] + (1 - weight) * sourceData[sourceIndex];
            sourceData[sourceIndex + 1] = weight * targetData[targetIndex + 1] + (1 - weight) * sourceData[sourceIndex + 1];
            sourceData[sourceIndex + 2] = weight * targetData[targetIndex + 2] + (1 - weight) * sourceData[sourceIndex + 2];
        }
    }
}
