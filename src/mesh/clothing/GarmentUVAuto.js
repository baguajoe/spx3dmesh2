
export function autoGarmentUV(mesh){

  if(!mesh?.geometry) return false

  mesh.geometry.computeBoundingBox()

  const box = mesh.geometry.boundingBox

  const sizeX = box.max.x-box.min.x
  const sizeY = box.max.y-box.min.y

  const uv = []

  const pos = mesh.geometry.attributes.position

  for(let i=0;i<pos.count;i++){

    const x = pos.getX(i)
    const y = pos.getY(i)

    uv.push(
      (x-box.min.x)/sizeX,
      (y-box.min.y)/sizeY
    )
  }

  mesh.geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uv,2)
  )

  return true
}
