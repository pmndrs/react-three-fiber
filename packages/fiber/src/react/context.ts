import React from 'react'
import { UseBoundStore, StoreApi } from 'zustand'
import { RootState } from '../core/store'

export const context = React.createContext<UseBoundStore<RootState, StoreApi<RootState>> | null>(null)
