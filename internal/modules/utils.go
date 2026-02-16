package modules

import "math"

func round(val float64, n int) float64 {
	pow := math.Pow(10, float64(n))
	return math.Round(val*pow) / pow
}
