import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import MobileClient from './MobileClient';
import MobileCompanyCard from './MobileCompanyCard';
import {cardEvents, clientEvents} from './events';

import './MobileCompany.css';

class MobileCompany extends React.PureComponent {

    static propTypes = {
        name: PropTypes.string.isRequired,
        titles: PropTypes.array.isRequired,
        clients:PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.number.isRequired,
                fam: PropTypes.string.isRequired,
                im: PropTypes.string.isRequired,
                otch: PropTypes.string.isRequired,
                balance: PropTypes.number.isRequired,
            })
        ),
    };

    componentDidMount = () => {
        cardEvents.addListener('saveData',this.saveData);
        cardEvents.addListener('cancel',this.cancel);
        clientEvents.addListener('delete', this.delete);
        clientEvents.addListener('edit', this.delete);
    };

    componentWillUnmount = () => {
        cardEvents.removeListener('saveData',this.saveData);
        cardEvents.removeListener('cancel',this.cancel);
        clientEvents.addListener('delete', this.delete);
        clientEvents.addListener('edit', this.delete);
    };

    state = {
        name: this.props.name,
        clients: [...this.props.clients],
        isCardOpened: false,
    };

    saveData = (clientData) => {
        //console.log('handle save event', clientData);
        this.addClient(clientData)
    };

    delete = (id) => {
        this.setState({
            clients: this.state.clients.filter(client => client.id !== id)
        });
    };

    cancel = () => {
        console.log('handle cancel event');
        this.cardToggler();
    };

    cardToggler = () => {
        this.setState({isCardOpened: !this.state.isCardOpened})
    };

    setName1 = () => {
        this.setState({name:'МТС'});
    };

    setName2 = () => {
        this.setState({name:'Velcom'});
    };

    addClient = (clientData) => {
        let [last] = this.state.clients.slice(-1);
        let newClient = {
            id: last.id + 1,
            ...clientData,
            balance: parseInt(clientData.balance),
            status: (parseInt(clientData.balance) > 0) ? 'active': 'blocked',
        };
        let newClients = [...this.state.clients, newClient];
        this.setState({clients: newClients});
    };

    setBalance = (clientId,newBalance) => {
        let changed=false;
        let newClients=[...this.state.clients]; // копия самого массива клиентов
        newClients.forEach( (c,i) => {
            if ( c.id==clientId && c.balance!=newBalance ) {
                let newClient={...c}; // копия хэша изменившегося клиента
                newClient.balance=newBalance;
                newClients[i]=newClient;
                changed=true;
            }
        } );
        if ( changed )
            this.setState({clients:newClients});
    };

    setBalance1 = () => {
        this.setBalance(105,230);
    };

    setBalance2 = () => {
        this.setBalance(105,250);
    };

    render() {

        console.log("MobileCompany render");


        let clientsCode = this.state.clients.map( (client, index) =>
            <MobileClient client={client} key={index} />
        );

        let ths = this.props.titles.map(title =>
            <th key={title}>{title}</th>
        );

        return (
            <Fragment>
                <div className='MobileCompany'>
                    <input type="button" value="МТС" onClick={this.setName1} />
                    <input type="button" value="Velcom" onClick={this.setName2} />
                    <div>{`Комнания: ${this.state.name}`}</div>

                    <div className='clients_filter'>
                        <input type="button" value="Все"  />
                        <input type="button" value="Активные"  />
                        <input type="button" value="Заблокированные"  />
                    </div>
                    <table className='MobileCompanyClients'>
                        <thead>
                        <tr>{ths}</tr>
                        </thead>
                        <tbody>
                        {clientsCode}
                        </tbody>
                    </table>
                    <div className='addClient'>
                        <input type="button" value="Добавить клиента" onClick={this.cardToggler} />
                    </div>
                </div>
                {
                    this.state.isCardOpened && <MobileCompanyCard/>
                }
            </Fragment>

        );
    }

}

export default MobileCompany;