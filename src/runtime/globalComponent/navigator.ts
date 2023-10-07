export const navigatorComponent = {
    template:  `<div @click="handleClick"><slot></slot></div>`,
    props: {
        url: {
            type: String,
        },
        openType: {
            type: String
        }
    },
    beforeCreate(){
    },
    methods: {
        handleClick(){
            let type = this.openType
            if(!type){
                type = "navigateTo"
            }
            wx[type]({url: this.url})
        }
    },
    data(){
        return {
        }
    },
}