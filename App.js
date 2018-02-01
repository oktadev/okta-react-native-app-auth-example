import React, { Component } from 'react';
import { UIManager, LayoutAnimation } from 'react-native';
import AppAuth from 'react-native-app-auth';
import { Page, Button, ButtonContainer, Form, Heading } from './components';
import { Buffer } from 'buffer';

UIManager.setLayoutAnimationEnabledExperimental &&
UIManager.setLayoutAnimationEnabledExperimental(true);

const scopes = ['openid', 'profile', 'email', 'offline_access'];

type State = {
  hasLoggedInOnce: boolean,
  accessToken: ?string,
  accessTokenExpirationDate: ?string,
  refreshToken: ?string,
  idToken: ?string
};

export default class App extends Component<{}, State> {
  auth = new AppAuth({
    issuer: 'https://dev-158606.oktapreview.com/oauth2/default',
    clientId: '0oaduuabexRNTJjhQ0h7',
    redirectUrl: 'com.oktapreview.dev-158606:/callback'
  });

  state = {
    hasLoggedInOnce: false,
    accessToken: '',
    accessTokenExpirationDate: '',
    refreshToken: '',
    idToken: '',
    beers: []
  };

  animateState(nextState: $Shape<State>, delay: number = 0) {
    setTimeout(() => {
      this.setState(() => {
        LayoutAnimation.easeInEaseOut();
        return nextState;
      });
    }, delay);
  }

  authorize = async () => {
    try {
      const authState = await this.auth.authorize(scopes);
      this.animateState(
        {
          hasLoggedInOnce: true,
          accessToken: authState.accessToken,
          idToken: authState.idToken,
          accessTokenExpirationDate: authState.accessTokenExpirationDate,
          refreshToken: authState.refreshToken
        },
        500
      );
    } catch (error) {
      console.error(error);
    }
  };

  refresh = async () => {
    try {
      const authState = await this.auth.refresh(this.state.refreshToken, scopes);
      this.animateState({
        accessToken: authState.accessToken || this.state.accessToken,
        accessTokenExpirationDate:
        authState.accessTokenExpirationDate || this.state.accessTokenExpirationDate,
        refreshToken: authState.refreshToken || this.state.refreshToken
      });
    } catch (error) {
      console.error(error);
    }
  };

  revoke = async () => {
    try {
      await this.auth.revokeToken(this.state.accessToken, true);
      this.animateState({
        accessToken: '',
        accessTokenExpirationDate: '',
        refreshToken: '',
        idToken: '',
        beers: []
      });
    } catch (error) {
      console.error(error);
    }
  };

  fetchGoodBeers = async () => {
    if (this.state.beers.length) {
      // reset to id token if beers is already populated
      this.animateState({beers: []})
    } else {
      fetch('http://localhost:8080/good-beers', {
        headers: {
          'Authorization': `Bearer ${this.state.accessToken}`
        }
      }).then(response => response.json())
        .then(data => {
          this.animateState({beers: data})
        })
        .catch(error => console.error(error));
    }
  };

  render() {
    const {state} = this;
    if (state.idToken) {
      const jwtBody = state.idToken.split('.')[1];
      const base64 = jwtBody.replace('-', '+').replace('_', '/');
      const decodedJwt = Buffer.from(base64, 'base64');
      state.idTokenJSON = JSON.parse(decodedJwt);
    }
    return (
      <Page>
        {!!state.accessToken ? (
          <Form>
            <Form.Label>accessToken</Form.Label>
            <Form.Value>{state.accessToken}</Form.Value>
            <Form.Label>{state.beers.length ? 'Good Beers' : 'ID Token'}</Form.Label>
            <Form.Value>{JSON.stringify(state.beers.length ? state.beers : state.idTokenJSON)}</Form.Value>
            <Form.Label>accessTokenExpirationDate</Form.Label>
            <Form.Value>{state.accessTokenExpirationDate}</Form.Value>
            <Form.Label>refreshToken</Form.Label>
            <Form.Value>{state.refreshToken}</Form.Value>
          </Form>
        ) : (
          <Heading>{state.hasLoggedInOnce ? 'Goodbye.' : 'Hello, stranger.'}</Heading>
        )}

        <ButtonContainer>
          {!state.accessToken && (
            <Button onPress={this.authorize} text="Authorize" color="#017CC0"/>
          )}
          {!!state.refreshToken && <Button onPress={this.refresh} text="Refresh" color="#24C2CB"/>}
          {!!state.accessToken && <Button onPress={this.revoke} text="Revoke" color="#EF525B"/>}
          {!!state.accessToken && <Button onPress={this.fetchGoodBeers} text={!this.state.beers.length ? 'Good Beers' : 'ID Token'} color="#008000" />}
        </ButtonContainer>
      </Page>
    );
  }
}