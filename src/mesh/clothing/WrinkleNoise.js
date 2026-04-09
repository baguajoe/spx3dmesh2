
import * as THREE from "three"

export function applyWrinkleNoise(mesh,strength=.01){

  if(!mesh?.geometry?.attributes?.position) return false

  const pos = mesh.geometry.attributes.position

  for(let i=0;i<pos.count;i++){

    const n = Math.sin(i*.37)*Math.cos(i*.13)

    pos.setXYZ(
      i,
      pos.getX(i)+n*strength,
      pos.getY(i)+n*strength*.5,
      pos.getZ(i)+n*strength
    )
  }

  pos.needsUpdate=true
  mesh.geometry.computeVertexNormals()

  return true
}
