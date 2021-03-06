import React, {Fragment} from "react";
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import './DeviceList.css'
import Device from "./Device";
import ContextMenu from '../ContextMenu/ContextMenu'
import {listUnitsEvents, msg} from "../../events/events";
import Card from "../Card/Card";
import NewDeviceCard from "../NewDeviceCard/NewDeviceCard";
import DetailsContainer from "../DetailsContainer/DetailsContainer";
import Paginator from "../Paginator/Paginator";
import {loadDevicesAC, filterDevicesAC, deleteDevicesAC, changeDeviceStateAC, sortDeviceAC, devicesLoadingAC, devicesErrorAC} from "../../redux/reducers/devicesAC";
import {sendRequest} from "../../helpers/sendRequest";
import C from '../../constants';
import Loader from "../Loader/Loader";

const titles = ['Номер устройства','Адрес установки', 'Модель устройства', 'Статус устройства'];

class DeviceList extends React.PureComponent {

    static propTypes = {
        devices: PropTypes.object.isRequired,
        evt: PropTypes.object.isRequired,
        devicesPerPage: PropTypes.number.isRequired,
        resizable: PropTypes.bool,
        dataPath: PropTypes.string,
    };

    state = {
        dataPath: '',
        currentPage: 1,
        selectedItemIdx: '',
        filter: '',
        filterIdx: null,
        sortBy: '',
        sortIdx: null,
        sortReverse: {
            sort0: false,
            sort1: false,
            sort2: false,
            sort3: false,
        },
        isItemCardActive: false,
        isNewDeviceCardActive: false,
        isControlPanelActive: false,
        lastEdited: {
            id: '',
            newFieldVal: '',
        },
    };

    componentWillReceiveProps = (newProps) => {
        if (newProps.devices !== this.props.devices){
            this.setState({
                devices: newProps.devices,
            })
        }
        if (newProps.currentPage !== this.props.currentPage){
            this.setState({currentPage: newProps.currentPage})
        }
        if (newProps.dataPath !== this.props.dataPath){
            if (newProps.dataPath){
                this.props.dispatch( devicesLoadingAC() );
                sendRequest(newProps.dataPath, result => {
                    if (result){
                        this.props.dispatch(loadDevicesAC(result));
                        this.setState({dataPath: newProps.dataPath})
                    }
                });
            }
        }
    };

    componentDidMount = () => {
        listUnitsEvents.addListener('highlightItem',this.highlightItem);
        listUnitsEvents.addListener('performFn', this.contextMenuHandler);
        listUnitsEvents.addListener('hideCard', this.hideCard);
        listUnitsEvents.addListener('changeState', this.changeDeviceState);
        listUnitsEvents.addListener('addDevice', this.handleNewDeviceEvent);

        try {
            let currentUrl = this.props.history.location.pathname;
            let pageNum = currentUrl.match(/\d/);
            if (pageNum) {
                this.setState({currentPage: parseInt(pageNum[0])});// selected page number from URL
            }
        } catch (e) {
            msg.emit('log', e);
        }
        this.loadDevices();
    };

    componentWillUnmount = () => {
        listUnitsEvents.removeListener('highlightItem', this.highlightItem);
        listUnitsEvents.removeListener('performFn', this.contextMenuHandler);
        listUnitsEvents.removeListener('hideCard', this.hideCard);
        listUnitsEvents.removeListener('changeState', this.changeDeviceState);
        listUnitsEvents.removeListener('addDevice', this.handleNewDeviceEvent);
    };

    loadDevices = () => {
        if (this.props.dataPath){
            this.props.dispatch( devicesLoadingAC() );
            sendRequest(this.props.dataPath, result => {
                if (result){
                    this.props.dispatch(loadDevicesAC(result))
                }
            });
        } else {
            console.log('no path')
        }
    };

    handleNewDeviceEvent = () => {
        console.log('new device event handle');
        this.setState({isNewDeviceCardActive: true});
    };

    checkIsDeviceExist = (newDeviceData) => {
        console.log('starting check exist new device in list...');
        console.log(newDeviceData.Id); /// send req to check if exist
        sendRequest('/cmd/isDeviceExist', response => !response.isExist
            ? this.addNewDevice(newDeviceData, response.type)
            : msg.emit('newDeviceResult',` Устройство с Id ${newDeviceData.Id} уже существует`),
            {...C.OPTIONS_POST, body: JSON.stringify({deviceId: newDeviceData.Id, type: newDeviceData.type})}
        );
    };

    addNewDevice = (newDeviceData, devType) => {
    let newDevice = {
        Info: {
            Bank: newDeviceData.Bank,
            Id: newDeviceData.Id,
            Address: newDeviceData.Address,
            Serial: newDeviceData.Serial,
            Model: newDeviceData.Model,
            Status: "Out Of Service"
        },
        Network: {
            IP: newDeviceData.IP,
            Port: "666",
            Config: "7000",
            Config_type: "",
            Last_reboot: ""
        },
        Software: {
            Agi: "",
            Sub_1: "Some ver",
            Sub_2: "Some ver",
            Sub_3: "Some ver",
            Sub_4: "Some ver"
        },
        Stats: {
            Repairs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            Sp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            Ink: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
    };
    let successMess = `Устройство Id ${newDeviceData.Id} добавлено`;
        console.log('prepare to add new device...', newDevice);
        sendRequest('/cmd/addDevice',
                response => response.result === 'ok'
                    ? msg.emit('newDeviceResult', successMess) &&  setTimeout( ( ) => {
                        msg.emit('log', successMess);
                        this.props.evt.emit('info', {type: 'success', message: successMess});
                        this.loadDevices();
                        this.hideCard();
                }, 2000)
                    : msg.emit('newDeviceResult', ` Ошибка при добавлении устройства`)
            ,
            {...C.OPTIONS_POST, body: JSON.stringify({type: devType, device: newDevice})}
        )
    };

    changeDeviceState = (id, state) => {
        let devices = [...this.props.devices.devices];
        let selectedDevice = devices.find( device => device.Info.Id === id);
        let selectedDeviceIndex = devices.findIndex(device => device.Info.Id === id); // editing id at current devices
        selectedDevice.Info.Status = state;
        devices[selectedDeviceIndex] = selectedDevice;
        this.props.dispatch(changeDeviceStateAC(devices));
        this.setState({lastEdited: {id: id, newFieldVal: state}});

        sendRequest('/cmd/change_state', result => console.log(result), {...C.OPTIONS_POST, body: JSON.stringify(devices)});
    };

    highlightItem = (id) => {
        this.setState({selectedItemIdx: id, isControlPanelActive: true});
    };

    contextMenuHandler = (fn, id, ref) => {
        console.log(fn, id);
        switch (fn) {
            case 'deleteElement': {
                let conf = window.confirm(`Вы действительно хотите удалить ${id}?`); //TODO create modal message component?
                if (conf){
                    let selectedRow = ref[id];
                    selectedRow.style.fontSize = 0;
                    selectedRow.style.height = 0;
                    setTimeout( () => {
                        let f = this.state.devices.devices.filter(device => device.Info.Id !== id);
                        this.setState({selectedItemIdx: '', });
                        this.props.dispatch(deleteDevicesAC(f));

                        sendRequest('/cmd/delete_device', result => console.log(result), {...C.OPTIONS_POST, body: JSON.stringify(f)});

                        this.props.evt.emit('info', {type: 'success', message: `Устройство ${id} удалено`});
                        listUnitsEvents.emit('itemDeleted');
                        msg.emit('log', `Устройство ${id} удалено`);
                    }, 500);

                }
                listUnitsEvents.emit('hideContext');
                break;
            }
            case 'viewElement': {
                console.log('need a element card');
                this.setState({isItemCardActive: true});
                listUnitsEvents.emit('hideContext');
            }
        }
    };

    hideCard = () => {
        this.setState({isItemCardActive: false, isNewDeviceCardActive: false});
    };

    currentPageChanged = (pageNum) => {
        this.setState({currentPage: pageNum}, this.updateHistory);
    };

    updateHistory = () => {
        console.log('update URL...');
        let page = /(admin\/\w+\/\w+\/\d)/;
        let currentUrl = this.props.history.location.pathname;
        let nextPage = currentUrl.match(page);
        nextPage = `${nextPage[0].replace(/\d/, this.state.currentPage)}`;
        this.props.history.push( this.props.history.location.pathname.replace(page, nextPage) );
    };

    filter = () => {
        let list;
        let colName;
        let dev;
        let filters = ['Id', 'Address', 'Model', 'Status'];
        if (this.state.filter !== ''){
            list = this.props.devices.loaded.filter( (device) => {
                dev = Object.keys(device.Info)
                    .filter( key => filters.includes(key))
                    .reduce((obj, key) => {
                        return { ...obj, [key]: device.Info[key] }
                    }, {});
                console.log('filter dev ------------', dev);
                colName = Object.keys(dev)[this.state.filterIdx]; // get a specific col name by index for filtering
                if(~dev[colName].indexOf(this.state.filter)) return true
            });
            if (list.length === 0 || list === undefined) { // if filter no results
                this.props.evt.emit('info', {type: 'error', message: `Нет такого устройства`});
            }
        }
        else {
            list = [...this.props.devices.loaded];
        }
        this.props.dispatch(filterDevicesAC(list));
    };

    filterHandler = (e) => {
        this.setState({
            filter: e.target.value,
            filterIdx: parseInt(e.target.id.match(/\d+/)[0]), // filter input index
        },  this.filter)
    };

    sort = () => {
        let {sortBy} = this.state;
        let {sort0, sort1, sort2, sort3} = this.state.sortReverse; // true - REVERSE SORT
        let devices = [...this.props.devices.devices];
        let sorted;

        if (sortBy === 'Номер устройства'){
            if (sort0){
                sorted = devices.sort( (a,b) => (a.Info.Id > b.Info.Id) ? 1 : -1);
            } else {
                sorted = devices.sort( (a,b) => (a.Info.Id < b.Info.Id) ? 1 : -1);
            }
        }
        if (sortBy === 'Адрес установки'){
            if (sort1){
                sorted = devices.sort( (a,b) => (a.Info.Address > b.Info.Address) ? 1 : -1);
            } else {
                sorted = devices.sort( (a,b) => (a.Info.Address < b.Info.Address) ? 1 : -1);
            }
        }
        if (sortBy === 'Модель устройства'){
            if (sort2){
                sorted = devices.sort( (a,b) => (a.Info.Model < b.Info.Model) ? 1 : -1);
            } else {
                sorted = devices.sort( (a,b) => (a.Info.Model > b.Info.Model) ? 1 : -1);
            }
        }
        if (sortBy === 'Статус устройства'){
            if (sort3){
                sorted = devices.sort( (a,b) => (a.Info.Status < b.Info.Status) ? 1 : -1);
            } else {
                sorted = devices.sort( (a,b) => (a.Info.Status > b.Info.Status) ? 1 : -1);
            }
        }

        this.props.dispatch(sortDeviceAC(sorted));
    };

    sortHandler = (e) => {
        let sortIdx = parseInt(e.target.id.match(/\d+/)[0]);
        if (sortIdx === 0){
            this.setState({
                sortBy: e.target.textContent,
                sortIdx: sortIdx,
                sortReverse: {...this.state.sortReverse, sort0: !this.state.sortReverse.sort0}
            }, this.sort)
        }
        if (sortIdx === 1){
            this.setState({
                sortBy: e.target.textContent,
                sortIdx: sortIdx,
                sortReverse: {...this.state.sortReverse, sort1: !this.state.sortReverse.sort1}
            }, this.sort)
        }
        if (sortIdx === 2){
            this.setState({
                sortBy: e.target.textContent,
                sortIdx: sortIdx,
                sortReverse: {...this.state.sortReverse, sort2: !this.state.sortReverse.sort2}
            }, this.sort)
        }
        if (sortIdx === 3){
            this.setState({
                sortBy: e.target.textContent,
                sortIdx: sortIdx,
                sortReverse: {...this.state.sortReverse, sort3: !this.state.sortReverse.sort3}
            }, this.sort)
        }
    };

    dragStartResizer = (e) => {
        console.log('resizing.....');
        e.target.style.opacity = '0.3';
        e.target.style.backgroundColor = 'darkred';
    };

    dragEndResizer = (e) => {
        console.log('resizing..... end');
        let resizers = []; // all resizers from refs
        for (let prop in this.refs) {
            if (prop.match(/resizer/)){
                resizers.push(this.refs[prop])
            }
        }
        let currResizer = resizers.find((resizer) => resizer === e.target ); // current resizer
        currResizer.style.backgroundColor = "transparent";
        let colWidth = currResizer.offsetParent.clientWidth;
        let offsetX = e.nativeEvent.offsetX;
        currResizer.parentElement.style.width = (colWidth + offsetX).toString() + 'px';
    };

    sortArrows = ['unfold_more', 'expand_less', 'expand_more'];

    createHead = () => {
        if (this.props.resizable) {
            return titles.map((title, index) => {
                    return (
                        <th key={title}>
                            <span className='resizer'
                                  ref={`resizer-${index}`}
                                  onDragStart={this.dragStartResizer}
                                  onDragEnd={this.dragEndResizer}
                                  draggable
                            />
                            <i className='material-icons md-18 sortArrows'>
                                { this.state.sortIdx === null
                                    ? this.sortArrows[0]
                                    : this.state.sortIdx === index
                                        ? this.state.sortReverse[`sort${index}`]
                                            ? this.sortArrows[1]
                                            : this.sortArrows[2]
                                        : this.sortArrows[0]
                                }
                            </i>
                            <span onClick={this.sortHandler} id={`sort${index}`}>{title}</span>
                            <input onKeyUp={this.filterHandler} id={`filterInput${index}`}/>
                        </th>
                    )
                }
            )
        }
        return titles.map((title, index) => {
                return (
                    <th key={title}>
                        <span>{title}</span>
                        <input onKeyUp={this.filterHandler} id={`filterInput${index}`}/>
                    </th>
                )
            }
        )

    };

    createPage = (currentPage) => {
        const { devices } = this.state.devices;
        const indexOfLast = currentPage * this.props.devicesPerPage;
        const indexOfFirst = indexOfLast - this.props.devicesPerPage;
        const currentDevices = devices.slice(indexOfFirst, indexOfLast);

        return currentDevices.map(device => (this.state.selectedItemIdx === device.Info.Id)
            ? <Device device={device.Info} key={device.Info.Id} selected={this.state.selectedItemIdx} lastEdited={this.state.lastEdited}/>
            : <Device device={device.Info} key={device.Info.Id}/>)
    };

    devForCard = []; //// extended terminal data initial is empty

    prepareChartDataForCard = () => {
        if (this.devForCard[0] !== undefined) {
            return {
                labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                datasets: [
                    {
                        label: 'Спорные ситуации',
                        data: this.devForCard[0].Stats.Sp,
                        fill: false,
                        backgroundColor: '#f54f2a',
                        borderColor: '#f54f2a'
                    },
                    {
                        label: 'Ремонты',
                        data: this.devForCard[0].Stats.Repairs,
                        fill: false,
                        backgroundColor: '#3292bb',
                        borderColor: '#3292bb'
                    },
                    {
                        label: 'Инкассации',
                        data: this.devForCard[0].Stats.Ink,
                        fill: false,
                        backgroundColor: '#66BB6A',
                        borderColor: '#66BB6A'
                    }
                ]
            };
        }
    };

    render () {

        if ( this.props.devices.status <= 1 )
            return <Loader/>;

        if ( this.props.devices.status === 2 )
            return "ошибка загрузки данных";

        console.log('DeviceList render');
        if (this.state.devices){
            console.log(this.state.devices.devices);
        }
        if (this.props.devices.status === 3 && this.state.devices !== undefined) {// if redux state devices is ready
            this.devForCard = this.props.devices.devices.filter( device => (this.state.selectedItemIdx === device.Info.Id) ? device : false); // extended terminal data
        }
        console.log('devForCard',this.devForCard);
        return (
            this.props.devices.status === 3 &&  this.state.devices !== undefined &&
            <Fragment>
                <table className='DeviceList'>
                    <thead>
                    <tr>{this.createHead()}</tr>
                    </thead>
                    <tbody>{this.createPage(this.state.currentPage)}</tbody>
                </table>
                <Paginator
                    currentPage={this.state.currentPage}
                    pagesCount={Math.ceil(this.state.devices.devices.length/this.props.devicesPerPage)}
                    cbCurrentPageChanged={this.currentPageChanged}
                />
                <ContextMenu forElement={this.state.selectedItemIdx}/>
                <Card isActive={this.state.isItemCardActive}
                          device={this.devForCard[0]}
                          chartData={this.prepareChartDataForCard()}
                />
                <NewDeviceCard isActive={this.state.isNewDeviceCardActive}
                               proceed={this.checkIsDeviceExist}
                />
                {this.state.selectedItemIdx && this.devForCard[0] !== undefined && <DetailsContainer chartData={this.prepareChartDataForCard()} repairs={this.devForCard[0].Repairs} />}
            </Fragment>
        );
    }
}

const mapStateToProps = ( {devices, loaded} ) => {
    return {
        devices,
        loaded,
    };
};

export default connect(mapStateToProps)(DeviceList)
