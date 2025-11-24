
const fs = require('fs');
const path = require('path');

const filePath = '/home/edu/autorenta/apps/web/src/assets/models/car-3d-model.glb';

try {
  const buffer = fs.readFileSync(filePath);

  // GLB Header: magic (4), version (4), length (4)
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);

  if (magic !== 0x46546C67) { // 'glTF'
    console.error('Not a valid GLB file');
    process.exit(1);
  }

  // Chunk 0: JSON
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);

  if (chunkType !== 0x4E4F534A) { // 'JSON'
    console.error('First chunk is not JSON');
    process.exit(1);
  }

  const jsonBuffer = buffer.subarray(20, 20 + chunkLength);
  const jsonStr = jsonBuffer.toString('utf8');
  const gltf = JSON.parse(jsonStr);

  console.log('=== GLTF Structure ===');
  console.log('Nodes:', gltf.nodes ? gltf.nodes.length : 0);
  console.log('Meshes:', gltf.meshes ? gltf.meshes.length : 0);
  console.log('Materials:', gltf.materials ? gltf.materials.length : 0);

  console.log('\n=== Node Hierarchy ===');

  function printNode(index, depth = 0) {
    const node = gltf.nodes[index];
    const indent = '  '.repeat(depth);
    const name = node.name || `Node_${index}`;
    const meshInfo = node.mesh !== undefined ? ` [Mesh: ${gltf.meshes[node.mesh].name || node.mesh}]` : '';
    console.log(`${indent}- ${name}${meshInfo}`);

    if (node.children) {
      node.children.forEach(childIndex => printNode(childIndex, depth + 1));
    }
  }

  if (gltf.scenes && gltf.scenes.length > 0) {
    const scene = gltf.scenes[gltf.scene || 0];
    scene.nodes.forEach(nodeIndex => printNode(nodeIndex));
  }

} catch (err) {
  console.error('Error reading file:', err);
}
