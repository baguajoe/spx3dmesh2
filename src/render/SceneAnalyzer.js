export function analyzeScene(scene){

  let verts = 0;
  let meshes = 0;

  scene.traverse(o=>{

    if(o.isMesh){

      meshes++;

      if(o.geometry?.attributes?.position){

        verts += o.geometry.attributes.position.count;

      }

    }

  });

  return { meshes, verts };

}
