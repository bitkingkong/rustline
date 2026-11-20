// Deterministic screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one stages the real game (no mock rendering), steps it forward with a
// scripted driver, and leaves a frame that a short game really looks like.
// The same seed always gives the same frame.
function fakeInput(throttle, steer) {
  return {
    moveX: () => steer,
    moveY: () => throttle,
    sprint: () => false,
    handbrake: () => false,
    mouseHeld: () => false,
    takeOrbit: () => ({ dx: 0, dy: 0 }),
    wasPressed: () => false,
    endFrame: () => {},
  };
}

function stepFor(world, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) world.step(1 / 60, { render: false });
}

export function stageShot(name, world) {
  const state = world.state;
  if (name === 'drive' || name === 'play' || name === 'chase') {
    world.setScreen('play');
    world.startGame(true);
    world.hud.tickBanner(10); // drop the 'RUSTLINE' title banner for the shot
    // Put Rosa in the smuggler's truck on the highway, heading east into town.
    const truck = state.parked.find((c) => c.truck) || state.parked[0];
    world.teleportPlayer(truck.x + 3, truck.z);
    world.giveCar(truck);
    truck.x = -60;
    truck.z = 3;
    truck.heading = Math.PI / 2;
    truck.speed = 0;
    truck.mesh.position.set(truck.x, 0, truck.z);
    truck.mesh.rotation.y = truck.heading - Math.PI / 2;
    if (name === 'chase') {
      world.setWanted(3);
      // Pull two police cars right behind the truck so the chase reads.
      const cops = state.policeCars.slice(0, 2);
      cops.forEach((cop, i) => {
        cop.x = truck.x - 14 - i * 9;
        cop.z = truck.z + (i === 0 ? 3 : -3);
        cop.heading = Math.PI / 2;
        cop.mesh.position.set(cop.x, 0, cop.z);
        cop.mesh.rotation.y = cop.heading - Math.PI / 2;
      });
    } else {
      world.startMissionDebug(0);
    }
    // Keep traffic out of the truck's lane so the shot reads cleanly.
    for (const car of state.traffic) {
      if (Math.abs(car.along - truck.x) < 90) car.along = car.along >= truck.x ? truck.x + 140 : truck.x - 140;
    }
    // Drive east down the highway; the camera eases in behind the truck.
    world.setAutopilotInput(fakeInput(1, 0));
    stepFor(world, 3);
    world.setAutopilotInput(null);
    if (name === 'chase') {
      // The truck outruns the patrol cars, so put two of them back on its
      // tail for the final frame.
      const cops = state.policeCars.slice(0, 2);
      cops.forEach((cop, i) => {
        cop.x = truck.x - 3 - i * 3;
        cop.z = truck.z + (i === 0 ? 6 : -6);
        cop.heading = Math.PI / 2;
        cop.speed = 24;
        cop.mesh.position.set(cop.x, 0, cop.z);
        cop.mesh.rotation.y = cop.heading - Math.PI / 2;
      });
    }
    return { screen: 'play' };
  }
  if (name === 'mission') {
    world.setScreen('play');
    world.startGame(true);
    world.startMissionDebug(0);
    world.showMissionBanner();
    const truck = state.parked.find((c) => c.truck) || state.parked[0];
    world.teleportPlayer(truck.x + 4, truck.z + 3);
    state.player.heading = Math.atan2(truck.x - state.player.x, truck.z - state.player.z);
    state.player.mesh.rotation.y = state.player.heading;
    world.setAutopilotInput(fakeInput(0, 0));
    stepFor(world, 1.5);
    world.setAutopilotInput(null);
    return { screen: 'play' };
  }
  // start (default): the title screen over a slow orbit of the desert highway.
  world.setScreen('title');
  stepFor(world, 3);
  return { screen: 'title' };
}
