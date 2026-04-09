
export const FABRIC_LIBRARY = {
  cotton:{
    stiffness:.6,
    damping:.98,
    thickness:.003,
    roughness:.85,
    metalness:.02,
    wrinkle:1
  },
  denim:{
    stiffness:.9,
    damping:.992,
    thickness:.006,
    roughness:.95,
    metalness:.03,
    wrinkle:.4
  },
  silk:{
    stiffness:.25,
    damping:.965,
    thickness:.002,
    roughness:.35,
    metalness:.05,
    wrinkle:1.5
  },
  leather:{
    stiffness:.95,
    damping:.993,
    thickness:.01,
    roughness:.6,
    metalness:.15,
    wrinkle:.2
  },
  rubber:{
    stiffness:.98,
    damping:.995,
    thickness:.008,
    roughness:.7,
    metalness:.05,
    wrinkle:.05
  }
}

export function applyFabricToClothState(state,fabricName){
  const f = FABRIC_LIBRARY[fabricName]
  if(!state || !f) return false

  state.constraintIterations = Math.round(3 + f.stiffness*8)
  state.damping = f.damping

  return true
}
