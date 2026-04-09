
export function scaleGarmentToMeasurements(mesh,measurements){

  if(!mesh) return false

  const scaleX = measurements.chest/100
  const scaleY = measurements.height/180
  const scaleZ = measurements.waist/100

  mesh.scale.set(scaleX,scaleY,scaleZ)

  return mesh
}
