export function runBatchRender(queue){

  for(const item of queue){

    const { renderer, scene, camera } = item;

    renderer.render(scene, camera);

  }

}
