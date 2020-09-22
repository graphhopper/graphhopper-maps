import React from 'react'
import ReactDOM from 'react-dom'

import {App} from '@/App'

const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App/>, root)
