import React from 'react'

const styles = require('./Sidebar.css')

export default () => (
    <div className={styles.sidebar}>
        <span>sidebar</span>
        <label>From</label>
        <input type="text"/>
        <label>To</label>
        <input type="text"/>
    </div>)