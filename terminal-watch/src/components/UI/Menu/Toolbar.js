import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {withRouter} from "react-router-dom";
import Message from '../Message/Message'

import './Toolbar.css';

class Toolbar extends React.PureComponent {

    static propTypes = {
        menu: PropTypes.array.isRequired,
    };

    componentDidMount = () => {
        this.props.evt.emit('loaded', 'Welcome to tWatch!');
    };

    componentWillUnmount = () => {

    };

    state = {
        activeIdx: null,
    };

    menuItemClick = (e, index) => {
        console.log(e.target);
        e.stopPropagation();
        if (this.state.activeIdx === index) {
            this.setState({activeIdx: null})
        } else {
            this.setState({activeIdx: index})
        }
    };

    menuItemHover = (e, index) => {
        this.state.activeIdx !== null ? this.setState({activeIdx: index}) : this.setState({activeIdx: null})
    };

    hideSubMenu = () => {
        this.setState({activeIdx: null})
    };

    logout = () => {
        console.log('logout event');
        this.props.history.push('/');
    };

    render() {

        console.log("Toolbar render");

        return (
            <div className='Toolbar'>
                <ul className='toolbar-list'>
                    {this.props.menu.map((item, index) => {
                        return (
                            <li className='toolbar-item' key={index}
                                onClick={(e) => this.menuItemClick(e, index)}
                                onMouseEnter={(e) => this.menuItemHover(e, index)}
                                onMouseLeave={this.hideSubMenu}
                            >
                                <a className='toolbar-item-link' href="#">
                                    <span className='toolbar-item-icon material-icons md-18'>{item.icon}</span>
                                    <span className='toolbar-item-text'>{item.label}</span>
                                    {item.nested && <span className='toolbar-item-arrow material-icons md-18'>arrow_drop_down</span>}
                                </a>
                                    {(item.nested && this.state.activeIdx === index)
                                        ? <ul className={'nested-list-active'} ref={`nested${index}`}>
                                            {
                                                item.nested.map((nestedItem, nestedIndex) => {
                                                return (
                                                    <li key={nestedIndex}>
                                                        <a className='toolbar-item-link' href="#">
                                                            <span className='toolbar-item-icon material-icons md-18'>{nestedItem.icon}</span>
                                                            <span className='toolbar-item-text'>{nestedItem.label}</span>
                                                        </a>
                                                    </li>
                                                )
                                            })
                                            }
                                            </ul>
                                        : false
                                    }
                            </li>
                        )
                    })}
                </ul>
                <div className='toolbar-additional'>
                    <input className='toolbar-input-search' type='text' placeholder='Поиск...'/>
                    <button className="mdc-button mdc-button--raised toolbar-logout " onClick={this.logout}><i className="material-icons">exit_to_app</i>Выйти</button>
                </div>
                <Message/>
            </div>
        );
    }

}

export default withRouter(Toolbar);
