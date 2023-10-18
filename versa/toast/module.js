import { Component, BEM } from 'Component'

export default class ToastComponent extends Component{
	name="toast"

	global={
		'success@toast': this.showSuccessToast
	}

	install(base){

	}

	showSuccessToast(base, {payload}){
		let toast = this.createToast(payload);
		base.node.appendChild(toast.node)
		toast
			.state('success', true)
			.state('active', true)
		;
		
		setTimeout(
			() => {
				toast.state('active', false)
				setTimeout(
					() => {
						toast.node.remove();
					}, 
					200
				)
			},
			1500
		)
	}

	createToast(data){
		const template = 
`<div class="toast__contents">
  <div class="toast__title">{{title}}</div>
  <div class="toast__subtitle">{{subtitle}}</div>
</div>
<div class="toast__closer"></div>`;
		const toast = new BEM('toast');
		toast.node = document.createElement('div')
		toast.node.classList.add('toast__item');
		toast.html(
			template
				.replaceAll(
					/{{[^}]*}}/g, 
					(match) => data[match.slice(2,-2)] || ''
				)
		);

		return toast;
	}
}