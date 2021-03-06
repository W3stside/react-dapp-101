import React from 'react'
import { getTokensAPI } from '../api/Tokens'
import { getDutchXAPI } from '../api/DutchX'
import { getWeb3API } from '../api/ProviderWeb3'

const defaultState = {
  USER: {
    account: 'CONNECTION ERROR',
    balance: undefined,
  },
  PROVIDER: {
    activeProvider: undefined,
    network: 'NETWORK NOT SUPPORTED',
    providers: [],
  },
  DX: {
    tokens: undefined,
  },
  CONTRACTS: {},
  loading: false,
}

const { Provider, Consumer } = React.createContext(defaultState)

const setToContext = new WeakMap()
const memoizedContextValue = ({
  state,
  // Dispatchers
  appLoading,
  getDXTokenBalance,
  grabDXState,
  grabUserState,
  registerProviders,
  saveContract,
  setActiveProvider,
}) => {
  if (setToContext.has(state)) return setToContext.get(state)

  const contextValue = { state, appLoading, grabUserState, grabDXState, registerProviders, setActiveProvider, getDXTokenBalance, saveContract }
  setToContext.set(state, contextValue)
  return contextValue
}

class AppProvider extends React.Component {
  state = {
    ...defaultState,
  }
  // GENERIC DISPATCHERS
  appLoading = loadingState => this.setState(({ loading: loadingState }))

  // CONTRACT DISPATCHERS
  saveContract = ({ name, contract }) =>
    this.setState(prevState => ({
      ...prevState,
      CONTRACTS: {
        ...prevState.CONTRACTS,
        [name]: contract,
      },
    }))


  // DX DISPATCHERS
  getDXTokenBalance = async (tokenAddress, userAccount) => {
    const { getTokenSymbol } = await getTokensAPI()
    const { getDXTokenBalance } = await getDutchXAPI()

    const [symbol, balance] = await Promise.all([
      getTokenSymbol(tokenAddress),
      getDXTokenBalance(tokenAddress, userAccount),
    ])
    return this.setState(prevState => ({
      ...prevState,
      DX: {
        ...prevState.DX,
        tokens: {
          [tokenAddress]: {
            symbol,
            balance: balance.toString(),
          },
        },
      },
    }))
  }

  grabDXState = async () => {
    const { getFRTAddress, getOWLAddress, getPriceFeedAddress } = await getDutchXAPI()
    const [frtTokenAddress, owlTokenAddress, priceFeedAddress] = await Promise.all([
      getFRTAddress(),
      getOWLAddress(),
      getPriceFeedAddress(),
    ])
    return this.setState(prevState => ({
      ...prevState,
      DX: {
        ...prevState.DX,
        tokenFRT: {
          address: frtTokenAddress,
          ...prevState.DX.tokenFRT,
        },
        tokenOWL: {
          address: owlTokenAddress,
          ...prevState.DX.tokenOWL,
        },
        priceFeed: priceFeedAddress,
      },
    }))
  }

  // PROVIDER DISPATCHERS
  setActiveProvider = providerName =>
    this.setState(prevState =>
      ({
        ...prevState,
        PROVIDER: {
          ...prevState.PROVIDER,
          activeProvider: providerName,
        },
      }))
  registerProviders = provider =>
    this.setState(prevState =>
      ({
        ...prevState,
        PROVIDER: {
          providers: [...provider, ...prevState.PROVIDER.providers],
        },
      }))

  // USER STATE DISPATCHERS
  grabUserState = async () => {
    const { getCurrentAccount, getNetwork, getCurrentBalance } = await getWeb3API()
    const [account, balance, network] = await Promise.all([
      getCurrentAccount(),
      getCurrentBalance(),
      getNetwork(),
    ])

    return this.setState(prevState =>
      ({
        ...prevState,
        USER: {
          account,
          balance,
        },
        PROVIDER: {
          ...prevState.PROVIDER,
          network,
        },
      }))
  }

  render() {
    return (
      <Provider value={memoizedContextValue(this)}>
        {this.props.children}
      </Provider>
    )
  }
}

export const connect = (mapContextToProps = ctx => ctx) => WrapComponent =>
  props => (
    <Consumer>
      {context => <WrapComponent {...props} {...mapContextToProps(context)} />}
    </Consumer>
  )

export default AppProvider
