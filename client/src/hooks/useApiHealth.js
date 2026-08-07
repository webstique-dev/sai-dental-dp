import { useCallback, useEffect, useState } from 'react'
import { getHealth } from '../services/healthService'

export default function useApiHealth() {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const applyResult = useCallback((result) => {
    setData(result)
    setError(null)
    setStatus('success')
  }, [])

  const applyError = useCallback((err) => {
    setError(err)
    setStatus('error')
  }, [])

  useEffect(() => {
    getHealth().then(applyResult).catch(applyError)
  }, [applyResult, applyError])

  const retry = useCallback(() => {
    setStatus('loading')
    getHealth().then(applyResult).catch(applyError)
  }, [applyResult, applyError])

  return { status, data, error, retry }
}
