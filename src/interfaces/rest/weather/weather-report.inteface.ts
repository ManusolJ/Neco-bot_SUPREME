import WeatherREST from "./weather-rest.interface";

export default interface WeatherReport {
  city: string;
  data: WeatherREST;
}
