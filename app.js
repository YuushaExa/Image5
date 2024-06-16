document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('brightness').addEventListener('input', updateFilters);
document.getElementById('contrast').addEventListener('input', updateFilters);
document.getElementById('saturation').addEventListener('input', updateFilters);
document.getElementById('hue').addEventListener('input', updateFilters);
document.getElementById('filter').addEventListener('change', updateFilters);
document.getElementById('move').addEventListener('click', startMoveMode);

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');

let imageTexture;
let program;
let brightness = 0;
let contrast = 1;
let saturation = 1;
let hue = 0;
let filter = 'none';

let isMoveMode = false;
let isDragging = false;
let initialMousePos = { x: 0, y: 0 };
let objectPos = { x: 0, y: 0 };
let objectScale = { x: 1, y: 1 };
let objectAngle = 0;

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
        objectScale.x * cos, objectScale.x * sin, 0,
        -objectScale.y * sin, objectScale.y * cos, 0,
        objectPos.x, objectPos.y, 1
    ]);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_transform'), false, transformMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function startMoveMode() {
    isMoveMode = true;
}

canvas.addEventListener('mousedown', (e) => {
    if (isMoveMode) {
        isDragging = true;
        initialMousePos.x = e.clientX;
        initialMousePos.y = e.clientY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - initialMousePos.x;
        const dy = e.clientY - initialMousePos.y;
        objectPos.x += dx / canvas.width;
        objectPos.y -= dy / canvas.height;
        initialMousePos.x = e.clientX;
        initialMousePos.y = e.clientY;
        render();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    isMoveMode = false;
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
    
