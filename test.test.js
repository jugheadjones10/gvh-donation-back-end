const hey = require("./test.js");

describe("Test receipt logic", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test("One intent submitted but no donation sent - should send to manual", async () => {
    const mockFunction = jest.fn();
    await hey(mockFunction);

    expect(mockFunction.mock.calls.length).toEqual(1);
  });
});
