import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * Renders the real routes in src/app. Testing Library v14 renders asynchronously, and
 * expo-router attaches its route helpers to the object renderRouter returns, not to `screen`.
 */
async function renderApp() {
  const rendering = renderRouter('./src/app', { initialUrl: '/' });
  await rendering;
  return { getPathname: () => rendering.getPathname() };
}

describe('app navigation', () => {
  it('goes from Home through the workout to the result and back home', async () => {
    const app = await renderApp();
    expect(app.getPathname()).toBe('/');

    await fireEvent.press(screen.getByRole('button', { name: 'Start Workout' }));
    expect(app.getPathname()).toBe('/workout');
    expect(screen.getByText('Challenge 1 of 3')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Finish workout' }));
    expect(app.getPathname()).toBe('/result');
    expect(screen.getByText('Workout complete!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(app.getPathname()).toBe('/');
    expect(screen.queryByText('Workout complete!')).not.toBeOnTheScreen();
  });

  it('opens Progress from Home with empty stats', async () => {
    const app = await renderApp();

    await fireEvent.press(screen.getByRole('button', { name: 'Your progress' }));
    expect(app.getPathname()).toBe('/progress');
    expect(screen.getByLabelText('Accuracy: no data yet')).toBeOnTheScreen();
  });
});
