mod utils;

use wasm_bindgen::prelude::*;
use rand::Rng;
use js_sys::Array;
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, rust-js-snake-game!");
}

static EPSILON: f64 = 0.0000001;

fn are_equal(one: f64, another: f64) -> bool {
    (one - another).abs() < EPSILON
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct Vector {
    pub x: f64,
    pub y: f64,
}

#[wasm_bindgen]
impl Vector {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Vector {
        Vector { x, y }
    }

    pub fn add(&self, other: &Vector) -> Vector {
        Vector::new(self.x + other.x, self.y + other.y)
    }

    pub fn subtract(&self, other: &Vector) -> Vector {
        Vector::new(self.x - other.x, self.y - other.y)
    }

    pub fn scale_by(&self, number: f64) -> Vector {
        Vector::new(self.x * number, self.y * number)
    }

    pub fn length(&self) -> f64 {
        self.x.hypot(self.y)
    }

    pub fn normalize(&self) -> Vector {
        self.scale_by(1_f64 / self.length())
    }
    
    pub fn equal_to(&self, other: &Vector) -> bool {
        are_equal(self.x, other.x) && are_equal(self.y, other.y)
    }
    
    pub fn is_opposite(&self, other: &Vector) -> bool {
        let sum = self.add(other);
        sum.equal_to(&Vector::new(0_f64, 0_f64))
    }

    pub fn dot_product(&self, other: &Vector) -> f64 {
        self.x * other.x + self.y * other.y
    }
}
#[derive(Copy, Clone)]
#[wasm_bindgen]
pub struct Food{
    pub coord: Vector,
    pub food_type: i8,
}

pub struct Segment<'a> {
    pub start: &'a Vector,
    pub end: &'a Vector,
}

impl<'a> Segment<'a> {
    pub fn new(start: &'a Vector, end: &'a Vector) -> Segment<'a> {
        Segment { start, end }
    }

    pub fn get_vector(&self) -> Vector {
        self.end.subtract(&self.start)
    }

    pub fn length(&self) -> f64 {
        self.get_vector().length()
    }

    pub fn is_point_inside(&self, point: &Vector) -> bool {
        let first = Segment::new(self.start, point);
        let second = Segment::new(point, self.end);
        are_equal(self.length(), first.length() + second.length())
    }

    pub fn is_point_inside_food(&self, food: &Food) -> bool {
        let first = Segment::new(self.start, &food.coord);
        let second = Segment::new(&food.coord, self.end);
        are_equal(self.length(), first.length() + second.length())
    }

    pub fn get_projected_point(&self, point: &Vector) -> Vector {
        let vector = self.get_vector();
        let diff = point.subtract(&self.start);
        let u = diff.dot_product(&vector) / vector.dot_product(&vector);
        let scaled = vector.scale_by(u);
        self.start.add(&scaled)
    }
}

fn get_segments_from_vectors(vectors: &[Vector]) -> Vec<Segment> {
    let pairs = vectors[..vectors.len() - 1].iter().zip(&vectors[1..]);
    pairs
        .map(|(s, e)| Segment::new(s, e))
        .collect::<Vec<Segment>>()
}

fn get_food(width: i32, height: i32, snake: &[Vector]) -> Food {
    let segments = get_segments_from_vectors(snake);
    let mut free_positions: Vec<Vector> = Vec::new();
    for x in 0..width {
        for y in 0..height {
            let point = Vector::new(f64::from(x) + 0.5, f64::from(y) + 0.5);
            if segments.iter().all(|s| !s.is_point_inside(&point)) {
                free_positions.push(point)
            }
        }
    }
    let index = rand::thread_rng().gen_range(0, free_positions.len());
    Food{coord: free_positions[index], food_type: rand::thread_rng().gen_range(0, 6) % 4}
}

#[wasm_bindgen]
pub enum Movement {
    TOP,
    RIGHT,
    DOWN,
    LEFT,
}

#[wasm_bindgen]
pub struct Game {
    pub width: i32,
    pub height: i32,
    pub speed: f64,
    snake: Vec<Vector>,
    pub direction: Vector,
    pub food: Food,
    pub score: i32,
}


#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(width: i32, height: i32, speed: f64, snake_length: i32, direction: Vector) -> Game {
        let head_x = (f64::from(width) / 2_f64).round() - 0.5;
        let head_y = (f64::from(height) / 2_f64).round() - 0.5;
        let head = Vector::new(head_x, head_y);
        let tailtip = head.subtract(&direction.scale_by(f64::from(snake_length)));
        let snake = vec![tailtip, head];
        let food = get_food(width, height, &snake);

        Game {
            width: width,
            height: height,
            speed: speed,
            snake: snake,
            direction: direction,
            food: food,
            score: 0,
        }
    }

    pub fn is_over(&self) -> bool {
        let snake_len = self.snake.len();
        let last = self.snake[snake_len - 1];
        let Vector { x, y } = last;
        if x < 0_f64 || x > f64::from(self.width) || y < 0_f64 || y > f64::from(self.height) {
            return true;
        }
        if snake_len < 5 {
            return false;
        }

        let segments = get_segments_from_vectors(&self.snake[..snake_len - 3]);
        return segments.iter().any(|segment| {
            let projected = segment.get_projected_point(&last);
            segment.is_point_inside(&projected) && Segment::new(&last, &projected).length() < 0.5
        });
    }

    fn process_movement(&mut self, timespan: f64, movement: Option<Movement>) {
        let distance = self.speed * timespan;
        let mut tail: Vec<Vector> = Vec::new();
        let mut snake_distance = distance;
        while self.snake.len() > 1 {
            let point = self.snake.remove(0);
            let next = &self.snake[0];
            let segment = Segment::new(&point, next);
            let length = segment.length();
            if length >= snake_distance {
                let vector = segment.get_vector().normalize().scale_by(snake_distance);
                tail.push(point.add(&vector));
                break;
            } else {
                snake_distance -= length;
            }
        }
        tail.append(&mut self.snake);
        self.snake = tail;
        let old_head = self.snake.pop().unwrap();
        let new_head = old_head.add(&self.direction.scale_by(distance));
        if movement.is_some() {
            let new_direction = match movement.unwrap() {
                Movement::TOP => Vector {
                    x: 0_f64,
                    y: -1_f64,
                },
                Movement::RIGHT => Vector { x: 1_f64, y: 0_f64 },
                Movement::DOWN => Vector { x: 0_f64, y: 1_f64 },
                Movement::LEFT => Vector {
                    x: -1_f64,
                    y: 0_f64,
                },
            };
            if !self.direction.is_opposite(&new_direction)
                && !self.direction.equal_to(&new_direction)
            {
                let Vector { x: old_x, y: old_y } = old_head;
                let old_x_rounded = old_x.round();
                let old_y_rounded = old_y.round();
                let new_x_rounded = new_head.x.round();
                let new_y_rounded = new_head.y.round();

                let rounded_x_changed = !are_equal(old_x_rounded, new_x_rounded);
                let rounded_y_changed = !are_equal(old_y_rounded, new_y_rounded);
                if rounded_x_changed || rounded_y_changed {
                    let (old, old_rounded, new_rounded) = if rounded_x_changed {
                        (old_x, old_x_rounded, new_x_rounded)
                    } else {
                        (old_y, old_y_rounded, new_y_rounded)
                    };
                    let breakpoint_component = old_rounded
                        + (if new_rounded > old_rounded {
                            0.5_f64
                        } else {
                            -0.5_f64
                        });
                    let breakpoint = if rounded_x_changed {
                        Vector::new(breakpoint_component, old_y)
                    } else {
                        Vector::new(old_x, breakpoint_component)
                    };
                    let vector =
                        new_direction.scale_by(distance - (old - breakpoint_component).abs());
                    let head = breakpoint.add(&vector);

                    self.snake.push(breakpoint);
                    self.snake.push(head);
                    self.direction = new_direction;
                    return;
                }
            }
        }
        self.snake.push(new_head);
    }

    fn process_food(&mut self) {
        let snake_len = self.snake.len();
        let head_segment = Segment::new(&self.snake[snake_len - 2], &self.snake[snake_len - 1]);

        if head_segment.is_point_inside_food(&self.food) {
            let tail_end = &self.snake[0];
            let before_tail_end = &self.snake[1];
            let tail_segment = Segment::new(before_tail_end, &tail_end);
            let new_tail_end = tail_end.add(&tail_segment.get_vector().normalize());
            self.snake[0] = new_tail_end;
            self.score += self.food.food_type as i32 + 1;
            self.food = get_food(self.width, self.height, &self.snake);

        }
    }

    pub fn process(&mut self, timespan: f64, movement: Option<Movement>) {
        self.process_movement(timespan, movement);
        self.process_food();
    }

    pub fn get_snake(&self) -> Array {
        self.snake.clone().into_iter().map(JsValue::from).collect()
    }
}