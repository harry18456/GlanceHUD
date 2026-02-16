
// Use reflect.DeepEqual for simplicity or hash.
// In SystemService:
// cache map[string]*protocol.DataPayload

// In StartMonitoring:
// if reflect.DeepEqual(data, s.cache[m.ID()]) { continue }
// s.cache[m.ID()] = data
// Emit()
