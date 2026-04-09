
export function offsetGarmentLayer(mesh,layerIndex=1,spacing=.01){

  mesh.position.z += layerIndex*spacing

  mesh.userData.layerIndex = layerIndex

  return mesh
}
