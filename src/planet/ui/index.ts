import { World } from 'engine/ecs/world';
import styles from './styles.css';
import { FollowComponent } from 'engine/ecs/components/follow';
import { TransformComponent } from 'engine/ecs/components';
import { FocusableComponent } from '../components/focusable';
import { MetaComponent } from '../components/meta';
import { FollowCameraComponent, OrbitCameraComponent } from 'engine/ecs/components/camera';
import { Entity } from 'engine/ecs';

/**
 * Construct the HTML user interface and insert it into the DOM
 *
 * @param wrapper Element to insert the UI into
 * @param gfx Graphics context
 * @param seed World seed
 *
 */
export function ui(wrapper: HTMLElement, world: World) {
	const style = document.createElement('style');
	style.innerHTML = styles;
	document.querySelector('head')!.appendChild(style);

	const el = document.createElement('div');
	el.className = 'ui';

	function render() {
		const entities = world.entitiesWithComponent(FocusableComponent);
		const entityList = Array.from(entities).map(e => {
			const meta = world.getComponent(e, MetaComponent);
			const name = meta?.name ?? "Unnamed Entity";
			const tran = world.getComponent(e, TransformComponent)!;
			const pos = tran.position.map(v => v.toFixed(2)).join(', ');
			return `<li><a href="#" data-entity="${e}">${e}: ${name}  [${pos}]</a></li>`;
		}).join('');
		el.innerHTML = `
			<aside>
				<ul>
					${entityList}
				</ul>
			</aside>
		`;
		function onClickEntity(e: Event) {
			e.preventDefault();
			const a = e.target as HTMLAnchorElement;
			const entity = a.dataset.entity;
			if (!entity) return;
			const cameraEnt: Entity = 
				world.entitiesWithComponent(FollowCameraComponent).values().next().value
				|| world.entitiesWithComponent(OrbitCameraComponent).values().next().value;
			const camera = (world.getComponent(cameraEnt, FollowCameraComponent) || world.getComponent(cameraEnt, OrbitCameraComponent))!;
			camera.target = parseInt(entity, 10);
		}
		el.querySelectorAll('a[data-entity]')
			.forEach(el => el.addEventListener('click', onClickEntity));
	}
	render();
	setInterval(render, 1000);


	wrapper.appendChild(el);
}
