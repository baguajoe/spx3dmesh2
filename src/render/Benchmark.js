
export async function benchmarkRender(renderer, scene, camera){

  const start = performance.now();

  for(let i=0;i<20;i++){

    renderer.render(scene,camera);

  }

  const end = performance.now();

  return (end-start)/20;

}
