
import * as THREE from "three"

export function applyThickness(mesh, thickness=.005){

  if(!mesh?.geometry) return false

  mesh.geometry.computeVertexNormals()

  const geo = mesh.geometry.clone()
  geo.scale(1+thickness,1+thickness,1+thickness)

  const inner = mesh.geometry.clone()

  const group = new THREE.Group()

  const outerMesh = new THREE.Mesh(
    geo,
    mesh.material.clone()
  )

  const innerMesh = new THREE.Mesh(
    inner,
    mesh.material.clone()
  )

  innerMesh.material.side = THREE.BackSide

  group.add(outerMesh)
  group.add(innerMesh)

  group.name = mesh.name+"_thick"

  mesh.parent.add(group)
  mesh.visible=false

  return group
}
