document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('brightness').addEventListener('input', updateFilters);
document.getElementById('contrast').addEventListener('input', updateFilters);
document.getElementById('saturation').addEventListener('input', updateFilters);

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');

let imageTexture;
let program;
let brightness = 0;
let contrast = 1;
let saturation = 1;

function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
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
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    
    gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), brightness);
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), saturation);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const vertexShaderSource = `
    attribute vec4 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = a_position;
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform float u_saturation;
    varying vec2 v_texCoord;
    void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        color.rgb += u_brightness;
        color.rgb = ((color.rgb - 0.5) * max(u_contrast, 0.0)) + 0.5;
        float grey = dot(color.rgb, vec3(0.3, 0.59, 0.11));
        color.rgb = mix(vec3(grey), color.rgb, u_saturation);
        gl_FragColor = color;
    }
`;
